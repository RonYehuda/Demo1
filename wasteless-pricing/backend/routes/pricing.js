const express = require('express');
const router = express.Router();
const { all, get, run } = require('../database/db');
const { updateAllPrices, getPricingSummary, getDaysToExpiry } = require('../services/pricingEngine');

// GET pricing summary/analytics
router.get('/summary', (req, res) => {
  try {
    const summary = getPricingSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST recalculate all prices
router.post('/calculate', (req, res) => {
  try {
    const updatedProducts = updateAllPrices();

    res.json({
      message: `Updated ${updatedProducts.length} products`,
      updatedProducts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET pricing rules
router.get('/rules', (req, res) => {
  try {
    const rules = all(`
      SELECT * FROM pricing_rules
      ORDER BY category, days_to_expiry DESC
    `);

    // Group by category
    const groupedRules = rules.reduce((acc, rule) => {
      if (!acc[rule.category]) {
        acc[rule.category] = [];
      }
      acc[rule.category].push(rule);
      return acc;
    }, {});

    res.json(groupedRules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update pricing rule
router.put('/rules/:id', (req, res) => {
  try {
    const { discount_percent } = req.body;

    if (discount_percent === undefined || discount_percent < 0 || discount_percent > 100) {
      return res.status(400).json({ error: 'Invalid discount percentage (must be 0-100)' });
    }

    const existing = get('SELECT * FROM pricing_rules WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Pricing rule not found' });
    }

    run('UPDATE pricing_rules SET discount_percent = ? WHERE id = ?', [discount_percent, req.params.id]);

    const updated = get('SELECT * FROM pricing_rules WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET price history for all products
router.get('/history', (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const history = all(`
      SELECT
        ph.*,
        p.name_he,
        p.name_en
      FROM price_history ph
      JOIN products p ON ph.product_id = p.id
      ORDER BY ph.created_at DESC
      LIMIT ?
    `, [parseInt(limit)]);

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET expiring products report
router.get('/expiring', (req, res) => {
  try {
    const { days = 7 } = req.query;

    const products = all(`
      SELECT * FROM products
      WHERE date(expiry_date) <= date('now', '+' || ? || ' days')
      ORDER BY expiry_date ASC
    `, [parseInt(days)]);

    const productsWithDays = products.map(p => ({
      ...p,
      days_to_expiry: getDaysToExpiry(p.expiry_date)
    }));

    const summary = {
      total: productsWithDays.length,
      byUrgency: {
        critical: productsWithDays.filter(p => p.days_to_expiry === 0).length,
        urgent: productsWithDays.filter(p => p.days_to_expiry === 1).length,
        warning: productsWithDays.filter(p => p.days_to_expiry >= 2 && p.days_to_expiry <= 3).length,
        normal: productsWithDays.filter(p => p.days_to_expiry > 3).length
      },
      products: productsWithDays
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
