const express = require('express');
const router = express.Router();
const {
  getDisplayData,
  sendBulkUpdate,
  getRecentEvents,
  testConnection
} = require('../services/novisignService');

// GET preview display data
router.get('/preview', (req, res) => {
  try {
    const displayData = getDisplayData();
    res.json({
      products: displayData,
      count: displayData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST bulk update to NoviSign
router.post('/bulk-update', async (req, res) => {
  try {
    const result = await sendBulkUpdate();

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.status || 400).json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET recent events log
router.get('/events', (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const events = getRecentEvents(parseInt(limit));

    // Parse JSON fields
    const parsedEvents = events.map(event => ({
      ...event,
      payload: event.payload ? tryParseJSON(event.payload) : null,
      response_body: event.response_body ? tryParseJSON(event.response_body) : null
    }));

    res.json(parsedEvents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET test connection
router.get('/test', async (req, res) => {
  try {
    const result = await testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET NoviSign configuration status
router.get('/status', (req, res) => {
  const url = process.env.NOVISIGN_URL || '';
  const apiKey = process.env.NOVISIGN_API_KEY || '';

  const isConfigured = url && !url.includes('{YOUR-ACCOUNT-KEY}') && apiKey && apiKey !== 'your_api_key_here';

  res.json({
    configured: isConfigured,
    urlSet: !!url && !url.includes('{YOUR-ACCOUNT-KEY}'),
    apiKeySet: !!apiKey && apiKey !== 'your_api_key_here',
    message: isConfigured
      ? 'NoviSign is configured'
      : 'Please configure NOVISIGN_URL and NOVISIGN_API_KEY in .env file'
  });
});

// Helper function to safely parse JSON
function tryParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

module.exports = router;
