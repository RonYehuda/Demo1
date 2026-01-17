const express = require('express');
const cors = require('cors');
const path = require('path');

// Load configuration (includes dotenv)
const config = require('./config/env');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const { initDatabase, closeDatabase, dbPath } = require('./database/db');
const { initPriceUpdateJob, runImmediateUpdate, stopAllJobs } = require('./utils/cronJobs');

// Import routes
const productsRouter = require('./routes/products');
const pricingRouter = require('./routes/pricing');
const novisignRouter = require('./routes/novisign');
const categoriesRouter = require('./routes/categories');

const app = express();
const PORT = config.port;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/products', productsRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/novisign', novisignRouter);
app.use('/api/categories', categoriesRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  try {
    const { get } = require('./database/db');
    const productCount = get('SELECT COUNT(*) as count FROM products');

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      productCount: productCount?.count || 0
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Serve frontend for all other routes (except API)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return notFoundHandler(req, res, next);
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Initialize database first
    await initDatabase();

    logger.info('');
    logger.info('╔════════════════════════════════════════════════════════╗');
    logger.info('║         WasteLess Dynamic Pricing System               ║');
    logger.info('╚════════════════════════════════════════════════════════╝');
    logger.info('');
    logger.info(`Server running at http://localhost:${PORT}`);
    logger.info(`Database: ${dbPath}`);
    logger.info(`NoviSign: ${config.novisign.isConfigured ? 'Configured' : 'Not configured'}`);
    logger.info(`AI Images: ${config.openai.isConfigured ? 'Configured' : 'Not configured'}`);

    // Initialize cron job
    initPriceUpdateJob(config.priceUpdateInterval);

    logger.info('');
    logger.info('API Endpoints:');
    logger.info('  GET    /api/health                    - Health check');
    logger.info('  GET    /api/products                  - List all products');
    logger.info('  POST   /api/products                  - Create product');
    logger.info('  GET    /api/categories                - List categories');
    logger.info('  POST   /api/categories                - Create category');
    logger.info('  GET    /api/pricing/summary           - Pricing analytics');
    logger.info('  POST   /api/novisign/bulk-update      - Update NoviSign displays');
    logger.info('');
    logger.info('Press Ctrl+C to stop the server');
    logger.info('════════════════════════════════════════════════════════');

    // Run initial price update
    try {
      await runImmediateUpdate();
    } catch (error) {
      logger.warn('Initial update skipped', { reason: error.message });
    }

    // Start listening
    app.listen(PORT);
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  stopAllJobs();
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  stopAllJobs();
  closeDatabase();
  process.exit(0);
});

module.exports = app;
