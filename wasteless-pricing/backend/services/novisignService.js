const axios = require('axios');
const { all, run } = require('../database/db');
const { getDaysToExpiry } = require('./pricingEngine');

const NOVISIGN_URL = process.env.NOVISIGN_URL || '';
const NOVISIGN_API_KEY = process.env.NOVISIGN_API_KEY || '';

/**
 * Format product data for NoviSign display
 */
function formatProductForDisplay(product) {
  const daysToExpiry = getDaysToExpiry(product.expiry_date);

  let urgencyLevel = 'normal';
  let urgencyText = '';

  if (daysToExpiry === 0) {
    urgencyLevel = 'critical';
    urgencyText = 'יום אחרון!';
  } else if (daysToExpiry === 1) {
    urgencyLevel = 'urgent';
    urgencyText = 'מחר יום אחרון!';
  } else if (daysToExpiry <= 3) {
    urgencyLevel = 'warning';
    urgencyText = `עוד ${daysToExpiry} ימים`;
  }

  return {
    id: product.id,
    name: product.name_he,
    nameEn: product.name_en,
    category: product.category_he,
    originalPrice: product.base_price.toFixed(2),
    discountedPrice: product.current_price.toFixed(2),
    discountPercent: product.discount_percent,
    unit: product.unit,
    expiryDate: product.expiry_date,
    daysToExpiry,
    urgencyLevel,
    urgencyText,
    hasDiscount: product.discount_percent > 0
  };
}

/**
 * Get all products formatted for NoviSign
 */
function getDisplayData() {
  const products = all(`
    SELECT * FROM products
    WHERE discount_percent > 0
    ORDER BY
      CASE
        WHEN date(expiry_date) <= date('now') THEN 0
        WHEN date(expiry_date) <= date('now', '+1 day') THEN 1
        WHEN date(expiry_date) <= date('now', '+2 days') THEN 2
        ELSE 3
      END,
      discount_percent DESC
    LIMIT 20
  `);

  return products.map(formatProductForDisplay);
}

/**
 * Log NoviSign event
 */
function logEvent(eventType, payload, responseStatus, responseBody) {
  run(
    `INSERT INTO novisign_events (event_type, payload, response_status, response_body)
     VALUES (?, ?, ?, ?)`,
    [
      eventType,
      JSON.stringify(payload),
      responseStatus,
      typeof responseBody === 'object' ? JSON.stringify(responseBody) : responseBody
    ]
  );
}

/**
 * Send bulk update to NoviSign
 */
async function sendBulkUpdate() {
  const displayData = getDisplayData();

  if (!NOVISIGN_URL || NOVISIGN_URL.includes('{YOUR-ACCOUNT-KEY}')) {
    logEvent('bulk-update', displayData, 0, 'NoviSign not configured - URL contains placeholder');
    return {
      success: false,
      message: 'NoviSign not configured. Please update NOVISIGN_URL in .env file.',
      preview: displayData
    };
  }

  const payload = {
    productUpdate: displayData,
    timestamp: new Date().toISOString(),
    totalProducts: displayData.length
  };

  try {
    const response = await axios.post(NOVISIGN_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NOVISIGN_API_KEY}`
      },
      timeout: 10000
    });

    logEvent('bulk-update', payload, response.status, response.data);

    return {
      success: true,
      message: `Successfully updated ${displayData.length} products on NoviSign displays`,
      status: response.status,
      data: response.data,
      preview: displayData
    };
  } catch (error) {
    const errorMessage = error.response?.data || error.message;
    logEvent('bulk-update', payload, error.response?.status || 0, errorMessage);

    return {
      success: false,
      message: `Failed to update NoviSign: ${errorMessage}`,
      status: error.response?.status,
      error: errorMessage,
      preview: displayData
    };
  }
}

/**
 * Get recent NoviSign events
 */
function getRecentEvents(limit = 10) {
  return all(
    `SELECT * FROM novisign_events
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit]
  );
}

/**
 * Test NoviSign connection
 */
async function testConnection() {
  if (!NOVISIGN_URL || NOVISIGN_URL.includes('{YOUR-ACCOUNT-KEY}')) {
    return {
      success: false,
      message: 'NoviSign URL not configured. Please update .env file.'
    };
  }

  try {
    const response = await axios.get(NOVISIGN_URL.replace('/items/product-pricing', ''), {
      headers: {
        'Authorization': `Bearer ${NOVISIGN_API_KEY}`
      },
      timeout: 5000
    });

    return {
      success: true,
      message: 'Successfully connected to NoviSign',
      status: response.status
    };
  } catch (error) {
    return {
      success: false,
      message: `Connection failed: ${error.message}`,
      status: error.response?.status
    };
  }
}

module.exports = {
  formatProductForDisplay,
  getDisplayData,
  sendBulkUpdate,
  getRecentEvents,
  testConnection,
  logEvent
};
