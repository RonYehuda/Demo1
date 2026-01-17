const cron = require('node-cron');
const { updateAllPrices } = require('../services/pricingEngine');
const { sendBulkUpdate } = require('../services/novisignService');

let scheduledTasks = [];

/**
 * Initialize scheduled price update job
 */
function initPriceUpdateJob(intervalMinutes = 5) {
  // Run every X minutes
  const cronExpression = `*/${intervalMinutes} * * * *`;

  const task = cron.schedule(cronExpression, async () => {
    console.log('🔄 Running automatic price update...');

    try {
      // Update prices based on expiry dates
      const updatedProducts = updateAllPrices();

      if (updatedProducts.length > 0) {
        console.log(`✅ Updated ${updatedProducts.length} products`);

        // Send updates to NoviSign
        const novisignResult = await sendBulkUpdate();

        if (novisignResult.success) {
          console.log('📺 NoviSign displays updated');
        } else {
          console.log(`⚠️  NoviSign update: ${novisignResult.message}`);
        }
      } else {
        console.log('ℹ️  No price changes needed');
      }
    } catch (error) {
      console.error('❌ Price update error:', error.message);
    }
  });

  scheduledTasks.push(task);

  console.log(`⏰ Auto-update interval: ${intervalMinutes} minutes`);

  return task;
}

/**
 * Run an immediate price update
 */
async function runImmediateUpdate() {
  console.log('🔄 Running immediate price update...');

  try {
    const updatedProducts = updateAllPrices();
    console.log(`✅ Updated ${updatedProducts.length} products`);

    const novisignResult = await sendBulkUpdate();

    if (novisignResult.success) {
      console.log('📺 NoviSign displays updated');
    } else {
      console.log(`⚠️  NoviSign: ${novisignResult.message}`);
    }

    return { updatedProducts, novisignResult };
  } catch (error) {
    console.error('❌ Update error:', error.message);
    throw error;
  }
}

/**
 * Stop all scheduled tasks
 */
function stopAllJobs() {
  scheduledTasks.forEach(task => task.stop());
  scheduledTasks = [];
  console.log('⏹️  All cron jobs stopped');
}

module.exports = {
  initPriceUpdateJob,
  runImmediateUpdate,
  stopAllJobs
};
