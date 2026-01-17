const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { initDatabase, closeDatabase, dbPath } = require('./database/db');
const { initPriceUpdateJob, runImmediateUpdate, stopAllJobs } = require('./utils/cronJobs');

// Import routes
const productsRouter = require('./routes/products');
const pricingRouter = require('./routes/pricing');
const novisignRouter = require('./routes/novisign');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/products', productsRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/novisign', novisignRouter);

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

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
async function startServer() {
  try {
    // Initialize database first
    await initDatabase();
    console.log('');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║         🛒 WasteLess Dynamic Pricing System            ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📊 Database: ${dbPath}`);
    console.log(`📺 NoviSign URL: ${process.env.NOVISIGN_URL || 'Not configured'}`);

    // Initialize cron job
    const updateInterval = parseInt(process.env.PRICE_UPDATE_INTERVAL) || 5;
    initPriceUpdateJob(updateInterval);

    console.log('');
    console.log('API Endpoints:');
    console.log('  GET    /api/health                    - Health check');
    console.log('  GET    /api/products                  - List all products');
    console.log('  POST   /api/products                  - Create product');
    console.log('  PUT    /api/products/:id              - Update product');
    console.log('  DELETE /api/products/:id              - Delete product');
    console.log('  GET    /api/pricing/summary           - Pricing analytics');
    console.log('  POST   /api/pricing/calculate         - Recalculate all prices');
    console.log('  POST   /api/novisign/bulk-update      - Update NoviSign displays');
    console.log('  GET    /api/novisign/preview          - Preview display data');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
    console.log('════════════════════════════════════════════════════════');

    // Run initial price update
    try {
      await runImmediateUpdate();
    } catch (error) {
      console.log('⚠️  Initial update skipped:', error.message);
    }

    // Start listening
    app.listen(PORT);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('');
  console.log('⏹️  SIGINT received, shutting down gracefully...');
  stopAllJobs();
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('');
  console.log('⏹️  SIGTERM received, shutting down gracefully...');
  stopAllJobs();
  closeDatabase();
  process.exit(0);
});

module.exports = app;
