/**
 * Winston logger configuration for WasteLess
 */

const winston = require('winston');
const path = require('path');

const logLevel = process.env.LOG_LEVEL || 'info';
const isProduction = process.env.NODE_ENV === 'production';

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// JSON format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

const transports = [
  new winston.transports.Console({
    format: consoleFormat
  })
];

// Add file transport in production
if (isProduction) {
  const logsDir = process.env.LOGS_DIR || './logs';
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat
    })
  );
}

const logger = winston.createLogger({
  level: logLevel,
  transports
});

// Helper methods for common logging patterns
logger.logRequest = (req, message = 'Request received') => {
  logger.info(message, {
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length ? req.query : undefined
  });
};

logger.logError = (error, context = {}) => {
  logger.error(error.message, {
    code: error.code,
    statusCode: error.statusCode,
    stack: error.stack,
    ...context
  });
};

module.exports = logger;
