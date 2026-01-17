/**
 * Standardized API response helpers
 */

const success = (res, data, statusCode = 200, meta = {}) => {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  });
};

const error = (res, message, statusCode = 500, code = 'ERROR', details = null) => {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code,
      message,
      details
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  });
};

const created = (res, data, meta = {}) => {
  return success(res, data, 201, meta);
};

const noContent = (res) => {
  return res.status(204).send();
};

const paginated = (res, data, page, limit, total) => {
  return success(res, data, 200, {
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
};

module.exports = {
  success,
  error,
  created,
  noContent,
  paginated
};
