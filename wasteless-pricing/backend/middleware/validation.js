/**
 * Input validation middleware using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value
    }));
    throw new ValidationError('Validation failed', details);
  }
  next();
};

// Product validation rules
const productValidation = {
  create: [
    body('name_he')
      .trim()
      .notEmpty().withMessage('Hebrew name is required')
      .isLength({ max: 100 }).withMessage('Hebrew name must be less than 100 characters'),
    body('name_en')
      .trim()
      .notEmpty().withMessage('English name is required')
      .isLength({ max: 100 }).withMessage('English name must be less than 100 characters'),
    body('category')
      .trim()
      .notEmpty().withMessage('Category is required'),
    body('base_price')
      .isFloat({ min: 0.01 }).withMessage('Base price must be a positive number'),
    body('quantity')
      .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
    body('expiry_date')
      .isISO8601().withMessage('Expiry date must be a valid date')
      .custom((value) => {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) {
          throw new Error('Expiry date cannot be in the past');
        }
        return true;
      }),
    body('unit')
      .optional()
      .trim()
      .isLength({ max: 20 }).withMessage('Unit must be less than 20 characters'),
    body('batch_number')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('Batch number must be less than 50 characters'),
    body('catalog_number')
      .optional()
      .trim()
      .isLength({ max: 20 }).withMessage('Catalog number must be less than 20 characters'),
    validate
  ],

  update: [
    param('id').isInt({ min: 1 }).withMessage('Invalid product ID'),
    body('name_he')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 }).withMessage('Hebrew name must be 1-100 characters'),
    body('name_en')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 }).withMessage('English name must be 1-100 characters'),
    body('base_price')
      .optional()
      .isFloat({ min: 0.01 }).withMessage('Base price must be a positive number'),
    body('quantity')
      .optional()
      .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
    body('expiry_date')
      .optional()
      .isISO8601().withMessage('Expiry date must be a valid date'),
    validate
  ],

  getById: [
    param('id').isInt({ min: 1 }).withMessage('Invalid product ID'),
    validate
  ],

  list: [
    query('category').optional().trim(),
    query('search').optional().trim(),
    query('expiry').optional().isIn(['today', 'tomorrow', 'week']).withMessage('Invalid expiry filter'),
    validate
  ]
};

// Category validation rules
const categoryValidation = {
  create: [
    body('name_en')
      .trim()
      .notEmpty().withMessage('English name is required')
      .isLength({ max: 50 }).withMessage('English name must be less than 50 characters')
      .matches(/^[a-z_]+$/).withMessage('English name must be lowercase letters and underscores only'),
    body('name_he')
      .trim()
      .notEmpty().withMessage('Hebrew name is required')
      .isLength({ max: 50 }).withMessage('Hebrew name must be less than 50 characters'),
    body('icon')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('Icon must be less than 50 characters'),
    body('sort_order')
      .optional()
      .isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer'),
    validate
  ],

  update: [
    param('id').isInt({ min: 1 }).withMessage('Invalid category ID'),
    body('name_en')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 }).withMessage('English name must be 1-50 characters'),
    body('name_he')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 }).withMessage('Hebrew name must be 1-50 characters'),
    validate
  ],

  getById: [
    param('id').isInt({ min: 1 }).withMessage('Invalid category ID'),
    validate
  ]
};

// Pricing rule validation
const pricingValidation = {
  update: [
    param('id').isInt({ min: 1 }).withMessage('Invalid rule ID'),
    body('discount_percent')
      .isInt({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),
    validate
  ]
};

module.exports = {
  validate,
  productValidation,
  categoryValidation,
  pricingValidation
};
