const { all, get, run, exec, saveDatabase } = require('../database/db');

/**
 * Calculate days until expiry from a date string
 */
function getDaysToExpiry(expiryDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Get the discount percentage for a product based on its category and days to expiry
 */
function getDiscountForProduct(category, daysToExpiry) {
  // Get the pricing rule that applies
  const rule = get(
    `SELECT discount_percent FROM pricing_rules
     WHERE category = ? AND days_to_expiry >= ?
     ORDER BY days_to_expiry ASC
     LIMIT 1`,
    [category, daysToExpiry]
  );

  if (rule) {
    return rule.discount_percent;
  }

  // Default discount logic if no rule found
  if (daysToExpiry >= 5) return 0;
  if (daysToExpiry >= 3) return 15;
  if (daysToExpiry === 2) return 30;
  if (daysToExpiry === 1) return 50;
  return 70;
}

/**
 * Calculate the discounted price
 */
function calculateDiscountedPrice(basePrice, discountPercent) {
  const discountedPrice = basePrice * (1 - discountPercent / 100);
  return Math.round(discountedPrice * 100) / 100;
}

/**
 * Update prices for all products based on their expiry dates
 */
function updateAllPrices() {
  const products = all('SELECT * FROM products');
  const updatedProducts = [];

  for (const product of products) {
    const daysToExpiry = getDaysToExpiry(product.expiry_date);
    const newDiscount = getDiscountForProduct(product.category, daysToExpiry);
    const newPrice = calculateDiscountedPrice(product.base_price, newDiscount);

    // Only update if price changed
    if (newDiscount !== product.discount_percent || newPrice !== product.current_price) {
      run(
        `UPDATE products
         SET current_price = ?, discount_percent = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newPrice, newDiscount, product.id]
      );

      run(
        `INSERT INTO price_history (product_id, old_price, new_price, old_discount, new_discount, reason)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [product.id, product.current_price, newPrice, product.discount_percent, newDiscount, `Auto-update: ${daysToExpiry} days to expiry`]
      );

      updatedProducts.push({
        ...product,
        old_price: product.current_price,
        old_discount: product.discount_percent,
        current_price: newPrice,
        discount_percent: newDiscount,
        days_to_expiry: daysToExpiry
      });
    }
  }

  return updatedProducts;
}

/**
 * Calculate price for a single product (used when adding/editing)
 */
function calculateProductPrice(basePrice, category, expiryDate) {
  const daysToExpiry = getDaysToExpiry(expiryDate);
  const discountPercent = getDiscountForProduct(category, daysToExpiry);
  const currentPrice = calculateDiscountedPrice(basePrice, discountPercent);

  return {
    currentPrice,
    discountPercent,
    daysToExpiry
  };
}

/**
 * Get pricing summary for dashboard
 */
function getPricingSummary() {
  const totalProducts = get('SELECT COUNT(*) as count FROM products');
  const discountedProducts = get('SELECT COUNT(*) as count FROM products WHERE discount_percent > 0');

  const expiringProducts = get(`
    SELECT COUNT(*) as count FROM products
    WHERE date(expiry_date) <= date('now', '+3 days')
  `);

  const totalSavings = get(`
    SELECT SUM((base_price - current_price) * quantity) as savings FROM products
    WHERE discount_percent > 0
  `);

  const categoryBreakdown = all(`
    SELECT category, category_he, COUNT(*) as count,
           AVG(discount_percent) as avg_discount,
           SUM((base_price - current_price) * quantity) as potential_savings
    FROM products
    GROUP BY category
  `);

  return {
    totalProducts: totalProducts?.count || 0,
    discountedProducts: discountedProducts?.count || 0,
    expiringProducts: expiringProducts?.count || 0,
    totalSavings: Math.round((totalSavings?.savings || 0) * 100) / 100,
    categoryBreakdown
  };
}

module.exports = {
  getDaysToExpiry,
  getDiscountForProduct,
  calculateDiscountedPrice,
  updateAllPrices,
  calculateProductPrice,
  getPricingSummary
};
