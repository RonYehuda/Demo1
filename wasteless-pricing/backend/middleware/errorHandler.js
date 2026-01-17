/**
 * Global error handling middleware
 */

const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');
const apiResponse = require('../utils/apiResponse');

// Async handler wrapper to catch errors in async route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Not found handler for undefined routes
const notFoundHandler = (req, res, next) => {
  return apiResponse.error(res, `Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND');
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.logError(err, {
    method: req.method,
    path: req.path,
    body: req.body
  });

  // Handle known operational errors
  if (err instanceof AppError) {
    return apiResponse.error(
      res,
      err.message,
      err.statusCode,
      err.code,
      err.details || null
    );
  }

  // Handle validation errors from express-validator
  if (err.type === 'entity.parse.failed') {
    return apiResponse.error(res, 'Invalid JSON in request body', 400, 'INVALID_JSON');
  }

  // Handle SQL errors
  if (err.message && err.message.includes('SQLITE')) {
    return apiResponse.error(res, 'Database error occurred', 500, 'DATABASE_ERROR');
  }

  // Default to 500 for unknown errors
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : err.message;

  return apiResponse.error(res, message, statusCode, 'INTERNAL_ERROR');
};

module.exports = {
  asyncHandler,
  notFoundHandler,
  errorHandler
};
