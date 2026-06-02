const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');

const generateQrToken = (orderId, shopId, amount) => {
  try {
    const payload = {
      orderId,
      shopId,
      amount
    };
    
    // Sign JWT that expires in exactly 120 seconds
    const token = jwt.sign(payload, env.QR_SECRET, { expiresIn: '120s' });
    return token;
  } catch (err) {
    logger.error('Error signing QR JWT token', err);
    throw new AppError('Failed to generate secure QR code token.', 500);
  }
};

const verifyQrToken = (token) => {
  try {
    const decoded = jwt.verify(token, env.QR_SECRET);
    return {
      valid: true,
      orderId: decoded.orderId,
      shopId: decoded.shopId,
      amount: decoded.amount
    };
  } catch (err) {
    logger.error('Error verifying QR JWT token', err);
    if (err.name === 'TokenExpiredError') {
      return { valid: false, error: 'QR_EXPIRED' };
    }
    return { valid: false, error: 'QR_INVALID' };
  }
};

module.exports = {
  generateQrToken,
  verifyQrToken
};
