const Razorpay = require('razorpay');
const crypto = require('crypto');
const env = require('./env');
const logger = require('../utils/logger');

let razorpay = null;

if (!env.MOCK_SERVICES) {
  try {
    razorpay = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET
    });
    logger.info('Razorpay initialized in REAL mode');
  } catch (err) {
    logger.error('Failed to initialize real Razorpay, falling back to MOCK mode', err);
    env.MOCK_SERVICES = true;
  }
}

if (env.MOCK_SERVICES) {
  logger.info('Razorpay initialized in MOCK mode');
  razorpay = {
    orders: {
      create: async (options) => {
        logger.info(`[MOCK] Creating Razorpay order: ${JSON.stringify(options)}`);
        const mockId = `order_mock_${crypto.randomBytes(8).toString('hex')}`;
        return {
          id: mockId,
          entity: 'order',
          amount: options.amount,
          amount_paid: 0,
          amount_due: options.amount,
          currency: options.currency,
          receipt: options.receipt,
          status: 'created',
          attempts: 0,
          notes: options.notes,
          created_at: Math.floor(Date.now() / 1000)
        };
      }
    }
  };
}

const verifyWebhookSignature = (rawBody, signature, secret) => {
  if (env.MOCK_SERVICES) {
    return true; // Auto-pass for mock mode
  }
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    return expectedSignature === signature;
  } catch (err) {
    logger.error('Error during Razorpay webhook signature verification', err);
    return false;
  }
};

module.exports = {
  razorpay,
  verifyWebhookSignature
};
