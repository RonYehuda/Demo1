/**
 * Image generation service using OpenAI DALL-E
 */

const config = require('../config/env');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');
const https = require('https');

let openai = null;

// Initialize OpenAI client if configured
if (config.openai.isConfigured) {
  const OpenAI = require('openai');
  openai = new OpenAI({
    apiKey: config.openai.apiKey
  });
}

/**
 * Generate a product image using AI
 * @param {string} productName - The name of the product
 * @param {string} category - The product category
 * @returns {Promise<string|null>} - The generated image filename or null
 */
async function generateProductImage(productName, category) {
  if (!openai) {
    logger.warn('OpenAI not configured, cannot generate image');
    return null;
  }

  try {
    const prompt = `A professional product photo of fresh ${productName} (${category}) on a clean white background, high quality food photography, vibrant colors, studio lighting`;

    logger.info('Generating AI image', { productName, category });

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'url'
    });

    const imageUrl = response.data[0].url;

    // Download the image
    const filename = `ai-${Date.now()}-${Math.round(Math.random() * 1E9)}.png`;
    const filepath = path.join(__dirname, '../../uploads/products', filename);

    await downloadImage(imageUrl, filepath);

    logger.info('AI image generated successfully', { filename });
    return filename;
  } catch (error) {
    logger.error('Failed to generate AI image', { error: error.message });
    return null;
  }
}

/**
 * Download an image from URL to file
 */
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete partial file
      reject(err);
    });
  });
}

/**
 * Check if AI image generation is available
 */
function isAIAvailable() {
  return config.openai.isConfigured;
}

module.exports = {
  generateProductImage,
  isAIAvailable
};
