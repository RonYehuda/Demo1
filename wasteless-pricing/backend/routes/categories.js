/**
 * Categories API routes
 */

const express = require('express');
const router = express.Router();
const { all, get, run } = require('../database/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { categoryValidation } = require('../middleware/validation');
const { NotFoundError, ConflictError } = require('../utils/errors');
const apiResponse = require('../utils/apiResponse');

// GET all categories
router.get('/', asyncHandler(async (req, res) => {
  const { active } = req.query;

  let query = 'SELECT * FROM categories';
  const params = [];

  if (active === 'true') {
    query += ' WHERE is_active = 1';
  }

  query += ' ORDER BY sort_order ASC, name_he ASC';

  const categories = all(query, params);
  return apiResponse.success(res, categories);
}));

// GET single category
router.get('/:id', categoryValidation.getById, asyncHandler(async (req, res) => {
  const category = get('SELECT * FROM categories WHERE id = ?', [req.params.id]);

  if (!category) {
    throw new NotFoundError('Category');
  }

  return apiResponse.success(res, category);
}));

// POST create category
router.post('/', categoryValidation.create, asyncHandler(async (req, res) => {
  const { name_en, name_he, icon, sort_order } = req.body;

  // Check if category already exists
  const existing = get('SELECT id FROM categories WHERE name_en = ?', [name_en]);
  if (existing) {
    throw new ConflictError('Category with this English name already exists');
  }

  const result = run(
    `INSERT INTO categories (name_en, name_he, icon, sort_order)
     VALUES (?, ?, ?, ?)`,
    [name_en, name_he, icon || null, sort_order || 0]
  );

  const newCategory = get('SELECT * FROM categories WHERE id = ?', [result.lastInsertRowid]);

  // Also create default pricing rules for this category
  const defaultRules = [
    { days: 5, discount: 0 },
    { days: 4, discount: 15 },
    { days: 3, discount: 15 },
    { days: 2, discount: 30 },
    { days: 1, discount: 50 },
    { days: 0, discount: 70 }
  ];

  for (const rule of defaultRules) {
    run(
      'INSERT INTO pricing_rules (category, days_to_expiry, discount_percent) VALUES (?, ?, ?)',
      [name_en, rule.days, rule.discount]
    );
  }

  return apiResponse.created(res, newCategory);
}));

// PUT update category
router.put('/:id', categoryValidation.update, asyncHandler(async (req, res) => {
  const existing = get('SELECT * FROM categories WHERE id = ?', [req.params.id]);

  if (!existing) {
    throw new NotFoundError('Category');
  }

  const { name_en, name_he, icon, sort_order, is_active } = req.body;

  // If name_en is changing, check for conflicts
  if (name_en && name_en !== existing.name_en) {
    const conflict = get('SELECT id FROM categories WHERE name_en = ? AND id != ?', [name_en, req.params.id]);
    if (conflict) {
      throw new ConflictError('Category with this English name already exists');
    }

    // Update pricing rules with the new category name
    run(
      'UPDATE pricing_rules SET category = ? WHERE category = ?',
      [name_en, existing.name_en]
    );

    // Update products with the new category name
    run(
      'UPDATE products SET category = ? WHERE category = ?',
      [name_en, existing.name_en]
    );
  }

  run(
    `UPDATE categories SET
      name_en = COALESCE(?, name_en),
      name_he = COALESCE(?, name_he),
      icon = COALESCE(?, icon),
      sort_order = COALESCE(?, sort_order),
      is_active = COALESCE(?, is_active),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [name_en, name_he, icon, sort_order, is_active, req.params.id]
  );

  const updatedCategory = get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  return apiResponse.success(res, updatedCategory);
}));

// DELETE category (soft delete)
router.delete('/:id', categoryValidation.getById, asyncHandler(async (req, res) => {
  const existing = get('SELECT * FROM categories WHERE id = ?', [req.params.id]);

  if (!existing) {
    throw new NotFoundError('Category');
  }

  // Check if any products use this category
  const productCount = get(
    'SELECT COUNT(*) as count FROM products WHERE category = ?',
    [existing.name_en]
  );

  if (productCount.count > 0) {
    // Soft delete - just deactivate
    run('UPDATE categories SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
    return apiResponse.success(res, {
      message: 'Category deactivated (has products)',
      id: req.params.id,
      productCount: productCount.count
    });
  }

  // Hard delete if no products use it
  run('DELETE FROM pricing_rules WHERE category = ?', [existing.name_en]);
  run('DELETE FROM categories WHERE id = ?', [req.params.id]);

  return apiResponse.success(res, { message: 'Category deleted', id: req.params.id });
}));

module.exports = router;
