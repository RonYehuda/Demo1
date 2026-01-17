const express = require('express');
const router = express.Router();
const { all, get, run } = require('../database/db');
const { calculateProductPrice, getDaysToExpiry } = require('../services/pricingEngine');
const { generateCatalogNumber, generateBatchNumber, getCategoryId, getCatalogSummary } = require('../services/catalogService');
const { generateProductImage, isAIAvailable } = require('../services/imageService');
const { asyncHandler } = require('../middleware/errorHandler');
const { productValidation } = require('../middleware/validation');
const { handleUpload, deleteImage } = require('../middleware/upload');
const { NotFoundError } = require('../utils/errors');
const apiResponse = require('../utils/apiResponse');

// GET all products
router.get('/', productValidation.list, asyncHandler(async (req, res) => {
  const { category, search, expiry, catalog_number } = req.query;

  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (catalog_number) {
    query += ' AND catalog_number = ?';
    params.push(catalog_number);
  }

  if (search) {
    query += ' AND (name_he LIKE ? OR name_en LIKE ? OR batch_number LIKE ? OR catalog_number LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (expiry === 'today') {
    query += " AND date(expiry_date) = date('now')";
  } else if (expiry === 'tomorrow') {
    query += " AND date(expiry_date) = date('now', '+1 day')";
  } else if (expiry === 'week') {
    query += " AND date(expiry_date) <= date('now', '+7 days')";
  }

  query += ' ORDER BY catalog_number ASC, expiry_date ASC';

  const products = all(query, params);

  // Add days_to_expiry to each product
  const productsWithDays = products.map(product => ({
    ...product,
    days_to_expiry: getDaysToExpiry(product.expiry_date)
  }));

  return apiResponse.success(res, productsWithDays);
}));

// GET single product
router.get('/:id', productValidation.getById, asyncHandler(async (req, res) => {
  const product = get('SELECT * FROM products WHERE id = ?', [req.params.id]);

  if (!product) {
    throw new NotFoundError('Product');
  }

  product.days_to_expiry = getDaysToExpiry(product.expiry_date);
  return apiResponse.success(res, product);
}));

// POST create product
router.post('/', productValidation.create, asyncHandler(async (req, res) => {
  const {
    name_he, name_en, category, category_he,
    base_price, quantity, unit, expiry_date, catalog_number
  } = req.body;

  // Generate or use provided catalog number
  let finalCatalogNumber = catalog_number;
  if (!finalCatalogNumber) {
    finalCatalogNumber = generateCatalogNumber(category);
  }

  // Generate batch number based on catalog number
  const batchNumber = generateBatchNumber(finalCatalogNumber);

  // Get category ID
  const categoryId = getCategoryId(category);

  // Calculate price based on expiry
  const { currentPrice, discountPercent, daysToExpiry } = calculateProductPrice(
    base_price, category, expiry_date
  );

  const result = run(
    `INSERT INTO products (
      name_he, name_en, category, category_he, category_id,
      catalog_number, batch_number, base_price, current_price,
      discount_percent, quantity, unit, expiry_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name_he, name_en, category, category_he || getCategoryHebrew(category),
      categoryId, finalCatalogNumber, batchNumber, base_price, currentPrice,
      discountPercent, quantity, unit || 'ק"ג', expiry_date
    ]
  );

  const newProduct = get('SELECT * FROM products WHERE id = ?', [result.lastInsertRowid]);
  newProduct.days_to_expiry = daysToExpiry;

  return apiResponse.created(res, newProduct);
}));

// PUT update product
router.put('/:id', productValidation.update, asyncHandler(async (req, res) => {
  const existing = get('SELECT * FROM products WHERE id = ?', [req.params.id]);

  if (!existing) {
    throw new NotFoundError('Product');
  }

  const {
    name_he, name_en, category, category_he,
    base_price, quantity, unit, expiry_date
  } = req.body;

  // Recalculate price if base_price or expiry_date changed
  const effectiveBasePrice = base_price || existing.base_price;
  const effectiveCategory = category || existing.category;
  const effectiveExpiryDate = expiry_date || existing.expiry_date;

  const { currentPrice, discountPercent, daysToExpiry } = calculateProductPrice(
    effectiveBasePrice, effectiveCategory, effectiveExpiryDate
  );

  // Get category ID if category changed
  const categoryId = category ? getCategoryId(category) : existing.category_id;

  run(
    `UPDATE products SET
      name_he = COALESCE(?, name_he),
      name_en = COALESCE(?, name_en),
      category = COALESCE(?, category),
      category_he = COALESCE(?, category_he),
      category_id = COALESCE(?, category_id),
      base_price = COALESCE(?, base_price),
      current_price = ?,
      discount_percent = ?,
      quantity = COALESCE(?, quantity),
      unit = COALESCE(?, unit),
      expiry_date = COALESCE(?, expiry_date),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      name_he, name_en, category, category_he, categoryId,
      base_price, currentPrice, discountPercent,
      quantity, unit, expiry_date,
      req.params.id
    ]
  );

  const updatedProduct = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  updatedProduct.days_to_expiry = daysToExpiry;

  return apiResponse.success(res, updatedProduct);
}));

// DELETE product
router.delete('/:id', productValidation.getById, asyncHandler(async (req, res) => {
  const existing = get('SELECT * FROM products WHERE id = ?', [req.params.id]);

  if (!existing) {
    throw new NotFoundError('Product');
  }

  // Delete related price history first
  run('DELETE FROM price_history WHERE product_id = ?', [req.params.id]);

  // Delete the product
  run('DELETE FROM products WHERE id = ?', [req.params.id]);

  return apiResponse.success(res, { message: 'Product deleted successfully', id: parseInt(req.params.id) });
}));

// GET product price history
router.get('/:id/history', productValidation.getById, asyncHandler(async (req, res) => {
  const history = all(
    `SELECT * FROM price_history
     WHERE product_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [req.params.id]
  );

  return apiResponse.success(res, history);
}));

// GET products by catalog number
router.get('/by-catalog/:catalogNumber', asyncHandler(async (req, res) => {
  const summary = getCatalogSummary(req.params.catalogNumber);

  if (!summary) {
    throw new NotFoundError('Catalog');
  }

  return apiResponse.success(res, summary);
}));

// POST upload image for product
router.post('/:id/image', productValidation.getById, handleUpload, asyncHandler(async (req, res) => {
  const product = get('SELECT * FROM products WHERE id = ?', [req.params.id]);

  if (!product) {
    throw new NotFoundError('Product');
  }

  if (!req.file) {
    return apiResponse.error(res, 'No image file provided', 400, 'NO_FILE');
  }

  // Delete old image if exists
  if (product.image_path) {
    deleteImage(product.image_path);
  }

  // Update product with new image path
  run('UPDATE products SET image_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [req.file.filename, req.params.id]);

  const updatedProduct = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  return apiResponse.success(res, updatedProduct);
}));

// DELETE image for product
router.delete('/:id/image', productValidation.getById, asyncHandler(async (req, res) => {
  const product = get('SELECT * FROM products WHERE id = ?', [req.params.id]);

  if (!product) {
    throw new NotFoundError('Product');
  }

  if (product.image_path) {
    deleteImage(product.image_path);
    run('UPDATE products SET image_path = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.params.id]);
  }

  return apiResponse.success(res, { message: 'Image deleted successfully' });
}));

// POST generate AI image for product
router.post('/:id/generate-image', productValidation.getById, asyncHandler(async (req, res) => {
  if (!isAIAvailable()) {
    return apiResponse.error(res, 'AI image generation is not configured', 503, 'AI_NOT_CONFIGURED');
  }

  const product = get('SELECT * FROM products WHERE id = ?', [req.params.id]);

  if (!product) {
    throw new NotFoundError('Product');
  }

  // Generate AI image
  const imagePath = await generateProductImage(product.name_en, product.category);

  if (!imagePath) {
    return apiResponse.error(res, 'Failed to generate image', 500, 'AI_GENERATION_FAILED');
  }

  // Delete old image if exists
  if (product.image_path) {
    deleteImage(product.image_path);
  }

  // Update product with new image path
  run('UPDATE products SET image_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [imagePath, req.params.id]);

  const updatedProduct = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  return apiResponse.success(res, updatedProduct);
}));

// GET AI availability status
router.get('/ai/status', asyncHandler(async (req, res) => {
  return apiResponse.success(res, { available: isAIAvailable() });
}));

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
