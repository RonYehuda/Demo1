/**
 * Environment configuration and validation
 */

const path = require('path');

// Load .env file
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  dbPath: process.env.DB_PATH || './backend/database/wasteless.db',

  // NoviSign Integration
  novisign: {
    url: process.env.NOVISIGN_URL || null,
    apiKey: process.env.NOVISIGN_API_KEY || null,
    isConfigured: !!(process.env.NOVISIGN_URL && process.env.NOVISIGN_API_KEY)
  },

  // Pricing
  priceUpdateInterval: parseInt(process.env.PRICE_UPDATE_INTERVAL, 10) || 5,

  // Uploads
  uploadsDir: process.env.UPLOADS_DIR || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024, // 5MB

  // Base URL for external links (images, etc.)
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // AI Image Generation (optional)
  openai: {
    apiKey: process.env.OPENAI_API_KEY || null,
    isConfigured: !!process.env.OPENAI_API_KEY
  }
};

// Validation function
function validateConfig() {
  const errors = [];

  if (config.port < 1 || config.port > 65535) {
    errors.push('PORT must be a valid port number (1-65535)');
  }

  if (config.priceUpdateInterval < 1) {
    errors.push('PRICE_UPDATE_INTERVAL must be at least 1 minute');
  }

  return errors;
}

// Validate on load
const validationErrors = validateConfig();
if (validationErrors.length > 0) {
  console.error('Configuration errors:');
  validationErrors.forEach(err => console.error(`  - ${err}`));
  process.exit(1);
}

module.exports = config;
