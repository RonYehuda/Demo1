const express = require('express');
const router = express.Router();
const { all, get, run } = require('../database/db');
const { calculateProductPrice, getDaysToExpiry } = require('../services/pricingEngine');

// GET all products
router.get('/', (req, res) => {
  try {
    const { category, search, expiry } = req.query;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (name_he LIKE ? OR name_en LIKE ? OR batch_number LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (expiry === 'today') {
      query += " AND date(expiry_date) = date('now')";
    } else if (expiry === 'tomorrow') {
      query += " AND date(expiry_date) = date('now', '+1 day')";
    } else if (expiry === 'week') {
      query += " AND date(expiry_date) <= date('now', '+7 days')";
    }

    query += ' ORDER BY expiry_date ASC, discount_percent DESC';

    const products = all(query, params);

    // Add days_to_expiry to each product
    const productsWithDays = products.map(product => ({
      ...product,
      days_to_expiry: getDaysToExpiry(product.expiry_date)
    }));

    res.json(productsWithDays);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single product
router.get('/:id', (req, res) => {
  try {
    const product = get('SELECT * FROM products WHERE id = ?', [req.params.id]);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    product.days_to_expiry = getDaysToExpiry(product.expiry_date);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create product
router.post('/', (req, res) => {
  try {
    const {
      name_he, name_en, category, category_he,
      base_price, quantity, unit, expiry_date, batch_number
    } = req.body;

    // Validate required fields
    if (!name_he || !name_en || !category || !base_price || !quantity || !expiry_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate price based on expiry
    const { currentPrice, discountPercent, daysToExpiry } = calculateProductPrice(
      base_price, category, expiry_date
    );

    const result = run(
      `INSERT INTO products (
        name_he, name_en, category, category_he, base_price, current_price,
        discount_percent, quantity, unit, expiry_date, batch_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name_he, name_en, category, category_he || getCategoryHebrew(category),
        base_price, currentPrice, discountPercent, quantity, unit || 'ק"ג',
        expiry_date, batch_number || null
      ]
    );

    const newProduct = get('SELECT * FROM products WHERE id = ?', [result.lastInsertRowid]);
    newProduct.days_to_expiry = daysToExpiry;

    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update product
router.put('/:id', (req, res) => {
  try {
    const existing = get('SELECT * FROM products WHERE id = ?', [req.params.id]);

    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const {
      name_he, name_en, category, category_he,
      base_price, quantity, unit, expiry_date, batch_number
    } = req.body;

    // Recalculate price if base_price or expiry_date changed
    const effectiveBasePrice = base_price || existing.base_price;
    const effectiveCategory = category || existing.category;
    const effectiveExpiryDate = expiry_date || existing.expiry_date;

    const { currentPrice, discountPercent, daysToExpiry } = calculateProductPrice(
      effectiveBasePrice, effectiveCategory, effectiveExpiryDate
    );

    run(
      `UPDATE products SET
        name_he = COALESCE(?, name_he),
        name_en = COALESCE(?, name_en),
        category = COALESCE(?, category),
        category_he = COALESCE(?, category_he),
        base_price = COALESCE(?, base_price),
        current_price = ?,
        discount_percent = ?,
        quantity = COALESCE(?, quantity),
        unit = COALESCE(?, unit),
        expiry_date = COALESCE(?, expiry_date),
        batch_number = COALESCE(?, batch_number),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        name_he, name_en, category, category_he,
        base_price, currentPrice, discountPercent,
        quantity, unit, expiry_date, batch_number,
        req.params.id
      ]
    );

    const updatedProduct = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    updatedProduct.days_to_expiry = daysToExpiry;

    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE product
router.delete('/:id', (req, res) => {
  try {
    const existing = get('SELECT * FROM products WHERE id = ?', [req.params.id]);

    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete related price history first
    run('DELETE FROM price_history WHERE product_id = ?', [req.params.id]);

    // Delete the product
    run('DELETE FROM products WHERE id = ?', [req.params.id]);

    res.json({ message: 'Product deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET product price history
router.get('/:id/history', (req, res) => {
  try {
    const history = all(
      `SELECT * FROM price_history
       WHERE product_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.params.id]
    );

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function for category translation
function getCategoryHebrew(category) {
  const translations = {
    'vegetables': 'ירקות',
    'fruits': 'פירות',
    'herbs': 'עשבי תיבול',
    'salads': 'סלטים',
    'dairy': 'מוצרי חלב',
    'bakery': 'מאפים'
  };
  return translations[category] || category;
}

module.exports = router;
