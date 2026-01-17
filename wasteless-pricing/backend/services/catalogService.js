/**
 * Catalog and SKU management service
 */

const { get, all } = require('../database/db');

// Category prefixes for catalog numbers
const CATEGORY_PREFIXES = {
  vegetables: 'VEG',
  fruits: 'FRU',
  herbs: 'HRB',
  salads: 'SAL',
  dairy: 'DAI',
  bakery: 'BAK'
};

/**
 * Generate a catalog number for a product
 * Format: PREFIX-XXXX (e.g., VEG-0001)
 */
function generateCatalogNumber(category) {
  const prefix = CATEGORY_PREFIXES[category] || 'GEN';

  // Get the max catalog number for this prefix
  const result = get(
    `SELECT catalog_number FROM products
     WHERE catalog_number LIKE ?
     ORDER BY catalog_number DESC
     LIMIT 1`,
    [`${prefix}-%`]
  );

  let nextNum = 1;
  if (result && result.catalog_number) {
    const currentNum = parseInt(result.catalog_number.split('-')[1], 10);
    if (!isNaN(currentNum)) {
      nextNum = currentNum + 1;
    }
  }

  return `${prefix}-${nextNum.toString().padStart(4, '0')}`;
}

/**
 * Generate a batch number for a product
 * Format: CATALOG-A, CATALOG-B, etc. or date-based
 */
function generateBatchNumber(catalogNumber) {
  // Get existing batches for this catalog number
  const batches = all(
    `SELECT batch_number FROM products
     WHERE catalog_number = ?
     ORDER BY batch_number DESC`,
    [catalogNumber]
  );

  if (batches.length === 0) {
    return `${catalogNumber}-A`;
  }

  // Find the next letter
  const lastBatch = batches[0].batch_number;
  const lastLetter = lastBatch.split('-').pop();

  if (lastLetter && lastLetter.length === 1 && /[A-Z]/.test(lastLetter)) {
    const nextLetter = String.fromCharCode(lastLetter.charCodeAt(0) + 1);
    if (nextLetter <= 'Z') {
      return `${catalogNumber}-${nextLetter}`;
    }
  }

  // Fallback to date-based if we run out of letters
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  return `${catalogNumber}-${date}`;
}

/**
 * Get all batches for a catalog number
 */
function getBatchesByCatalog(catalogNumber) {
  return all(
    `SELECT * FROM products
     WHERE catalog_number = ?
     ORDER BY expiry_date ASC`,
    [catalogNumber]
  );
}

/**
 * Get aggregated info for a catalog number
 */
function getCatalogSummary(catalogNumber) {
  const batches = getBatchesByCatalog(catalogNumber);

  if (batches.length === 0) {
    return null;
  }

  const firstBatch = batches[0];
  const totalQuantity = batches.reduce((sum, b) => sum + b.quantity, 0);
  const minPrice = Math.min(...batches.map(b => b.current_price));
  const maxDiscount = Math.max(...batches.map(b => b.discount_percent));
  const earliestExpiry = batches[0].expiry_date;

  return {
    catalog_number: catalogNumber,
    name_he: firstBatch.name_he,
    name_en: firstBatch.name_en,
    category: firstBatch.category,
    category_he: firstBatch.category_he,
    base_price: firstBatch.base_price,
    batch_count: batches.length,
    total_quantity: totalQuantity,
    min_current_price: minPrice,
    max_discount_percent: maxDiscount,
    earliest_expiry: earliestExpiry,
    batches: batches
  };
}

/**
 * Get category ID by name
 */
function getCategoryId(categoryName) {
  const category = get(
    'SELECT id FROM categories WHERE name_en = ?',
    [categoryName]
  );
  return category ? category.id : null;
}

module.exports = {
  generateCatalogNumber,
  generateBatchNumber,
  getBatchesByCatalog,
  getCatalogSummary,
  getCategoryId,
  CATEGORY_PREFIXES
};
