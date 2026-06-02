const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { pool } = require('../../config/db');
const { generateQrToken, verifyQrToken } = require('../qr/qr.service');
const { razorpay, verifyWebhookSignature } = require('../../config/razorpay');
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');
const env = require('../../config/env');

// SSE Client Hub for local realtime updates
const activeSseConnections = new Map(); // shopId -> array of res objects

const broadcastTransactionUpdate = (shopId, transaction) => {
  const clients = activeSseConnections.get(shopId) || [];
  logger.info(`Broadcasting payment update to ${clients.length} merchant SSE clients for shop ${shopId}`);
  
  // Format data as SSE message
  const message = `data: ${JSON.stringify(transaction)}\n\n`;
  
  clients.forEach(res => {
    try {
      res.write(message);
    } catch (err) {
      logger.error('Failed to write to SSE client connection', err);
    }
  });
};

// --- ROUTES ---

// 1. GET /api/payment/stream - Server-Sent Events endpoint for merchants
router.get('/payment/stream', (req, res) => {
  const { shopId } = req.query;
  if (!shopId) {
    return res.status(400).json({ error: 'shopId is required' });
  }

  // Setup headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Add client to active connections
  const currentClients = activeSseConnections.get(shopId) || [];
  currentClients.push(res);
  activeSseConnections.set(shopId, currentClients);
  
  logger.info(`Merchant SSE client subscribed to shop: ${shopId}. Active shop clients: ${currentClients.length}`);

  // Send initial ping to keep connection alive
  res.write('data: {"connected": true}\n\n');

  // Ping interval
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch (err) {
      // client disconnected
      clearInterval(pingInterval);
    }
  }, 30000);

  req.on('close', () => {
    clearInterval(pingInterval);
    const clients = activeSseConnections.get(shopId) || [];
    const index = clients.indexOf(res);
    if (index !== -1) {
      clients.splice(index, 1);
    }
    activeSseConnections.set(shopId, clients);
    logger.info(`Merchant SSE client disconnected from shop: ${shopId}. Remaining shop clients: ${clients.length}`);
  });
});

// 2. POST /api/merchant/bills/generate-qr - Generate secure Bill QR code
router.post('/merchant/bills/generate-qr', requireAuth, requireRole('shopkeeper'), asyncHandler(async (req, res, next) => {
  const { amount } = req.body;

  if (!amount || isNaN(amount) || amount <= 0) {
    return next(new AppError('Please provide a valid bill amount greater than 0.', 400));
  }

  // Fetch merchant's shop
  const shopRes = await pool.query(
    'SELECT id, name FROM public.shops WHERE owner_id = $1 AND is_active = true',
    [req.user.id]
  );

  if (shopRes.rows.length === 0) {
    return next(new AppError('No active shop profile found. Please configure your shop first.', 404));
  }

  const shop = shopRes.rows[0];
  const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const expiresAt = new Date(Date.now() + 120 * 1000); // 120 seconds expiry

  // Insert pending transaction record
  await pool.query(
    `INSERT INTO public.transactions 
      (order_id, shop_id, amount, status, expires_at, created_at, updated_at)
     VALUES 
      ($1, $2, $3, 'pending', $4, now(), now())`,
    [orderId, shop.id, amount, expiresAt]
  );

  // Generate signed QR JWT token
  const qrToken = generateQrToken(orderId, shop.id, amount);

  // Determine client origin dynamically
  let clientOrigin = env.CLIENT_ORIGIN;
  if (clientOrigin === 'http://localhost:5173') {
    const host = req.headers['x-forwarded-host'] || req.get('host');
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
      clientOrigin = `${protocol}://${host}`;
    }
  }

  // Generate full redirect URL for scanning
  const qrUrl = `${clientOrigin}/customer/scan?token=${qrToken}`;

  // Generate QR code data URL image from the redirect URL
  const qrDataUrl = await QRCode.toDataURL(qrUrl);

  res.status(201).json({
    status: 'success',
    data: {
      orderId,
      qrDataUrl,
      expiresAt: expiresAt.toISOString(),
      amount
    }
  });
}));

// 3. POST /api/payment/initiate-from-qr - Validate scanned QR code
router.post('/payment/initiate-from-qr', requireAuth, asyncHandler(async (req, res, next) => {
  const { qrToken } = req.body;

  if (!qrToken) {
    return next(new AppError('QR token is required.', 400));
  }

  // Verify JWT token signature and expiration
  const verifyResult = verifyQrToken(qrToken);

  if (!verifyResult.valid) {
    return res.status(400).json({
      status: 'fail',
      code: verifyResult.error,
      message: verifyResult.error === 'QR_EXPIRED' 
        ? 'This QR code has expired. Ask the shopkeeper to generate a new one.' 
        : 'Invalid QR code.'
    });
  }

  const { orderId, shopId, amount } = verifyResult;

  // Retrieve transaction from database
  const txnRes = await pool.query(
    'SELECT * FROM public.transactions WHERE order_id = $1',
    [orderId]
  );

  if (txnRes.rows.length === 0) {
    return next(new AppError('Transaction order not found in system.', 404));
  }

  const transaction = txnRes.rows[0];

  // Verify statuses
  if (transaction.status !== 'pending') {
    return res.status(400).json({
      status: 'fail',
      code: 'TRANSACTION_ALREADY_COMPLETED',
      message: `This transaction has already been paid or processed (status: ${transaction.status}).`
    });
  }

  // Check database expiry
  if (new Date(transaction.expires_at) < new Date()) {
    // Update status to expired
    await pool.query(
      "UPDATE public.transactions SET status = 'expired', updated_at = now() WHERE id = $1",
      [transaction.id]
    );
    return res.status(400).json({
      status: 'fail',
      code: 'QR_EXPIRED',
      message: 'This QR code has expired. Ask the shopkeeper to generate a new one.'
    });
  }

  // Fetch shop rules
  const shopRes = await pool.query(
    'SELECT id, name, earn_points_per_100, redeem_points_per_rupee FROM public.shops WHERE id = $1',
    [shopId]
  );

  if (shopRes.rows.length === 0) {
    return next(new AppError('Shop not found.', 404));
  }

  const shop = shopRes.rows[0];

  res.status(200).json({
    status: 'success',
    data: {
      orderId,
      shopId: shop.id,
      shopName: shop.name,
      amount,
      earnRate: shop.earn_points_per_100,
      redeemRate: shop.redeem_points_per_rupee,
      expiresAt: transaction.expires_at
    }
  });
}));

// 4. POST /api/payment/reward-preview - Preview discount calculations
router.post('/payment/reward-preview', requireAuth, asyncHandler(async (req, res, next) => {
  const { orderId, applyRewards } = req.body;

  if (!orderId) {
    return next(new AppError('Order ID is required.', 400));
  }

  // Fetch transaction
  const txnRes = await pool.query(
    'SELECT * FROM public.transactions WHERE order_id = $1',
    [orderId]
  );

  if (txnRes.rows.length === 0) {
    return next(new AppError('Transaction not found.', 404));
  }

  const transaction = txnRes.rows[0];

  // Fetch shop rules
  const shopRes = await pool.query(
    'SELECT id, name, redeem_points_per_rupee, upi_id FROM public.shops WHERE id = $1',
    [transaction.shop_id]
  );

  if (shopRes.rows.length === 0) {
    return next(new AppError('Associated shop not found.', 404));
  }

  const shop = shopRes.rows[0];
  const billAmount = transaction.amount;
  const userPoints = req.user.pointsBalance;

  let rewardDiscount = 0;
  let pointsToRedeem = 0;
  let remainingUpi = billAmount;

  if (applyRewards && userPoints > 0) {
    const maxDiscountRupees = Math.floor(userPoints / shop.redeem_points_per_rupee);
    rewardDiscount = Math.min(maxDiscountRupees, billAmount);
    pointsToRedeem = rewardDiscount * shop.redeem_points_per_rupee;
    remainingUpi = billAmount - rewardDiscount;
  }

  res.status(200).json({
    status: 'success',
    data: {
      rewardDiscount,
      pointsToRedeem,
      remainingUpi,
      shopId: shop.id,
      shopName: shop.name,
      upiId: shop.upi_id || '7349417848@ybl',
      redeemRate: shop.redeem_points_per_rupee,
      paymentMode: rewardDiscount === 0
        ? 'normal_upi'
        : remainingUpi === 0
          ? 'full_reward'
          : 'partial_reward_upi'
    }
  });
}));

// 5. POST /api/payment/create-order - Initiate payment (Normal UPI or Partial)
router.post('/payment/create-order', requireAuth, asyncHandler(async (req, res, next) => {
  const { orderId, rewardPointsToRedeem } = req.body;

  if (!orderId || rewardPointsToRedeem === undefined) {
    return next(new AppError('Order ID and reward points to redeem are required.', 400));
  }

  const pointsToRedeem = parseInt(rewardPointsToRedeem, 10);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock transaction row
    const txnRes = await client.query(
      'SELECT * FROM public.transactions WHERE order_id = $1 FOR UPDATE',
      [orderId]
    );

    if (txnRes.rows.length === 0) {
      throw new AppError('Transaction not found.', 404);
    }

    const transaction = txnRes.rows[0];

    if (transaction.status !== 'pending') {
      throw new AppError('Transaction is no longer pending.', 400);
    }

    if (new Date(transaction.expires_at) < new Date()) {
      throw new AppError('This transaction QR has expired.', 400);
    }

    // 2. Fetch shop rules
    const shopRes = await client.query(
      'SELECT redeem_points_per_rupee FROM public.shops WHERE id = $1',
      [transaction.shop_id]
    );
    const shop = shopRes.rows[0];

    // 3. Verify customer points balance
    const userLockRes = await client.query(
      'SELECT points_balance FROM public.users WHERE id = $1 FOR UPDATE',
      [req.user.id]
    );
    const pointsBalance = userLockRes.rows[0].points_balance;

    if (pointsToRedeem > 0 && pointsBalance < pointsToRedeem) {
      throw new AppError('Insufficient points balance.', 400);
    }

    // 4. Calculate amounts
    const rewardValue = Math.floor(pointsToRedeem / shop.redeem_points_per_rupee);
    const remainingUpi = transaction.amount - rewardValue;

    if (remainingUpi <= 0) {
      throw new AppError('UPI portion is zero or negative. Please use the /reward-only endpoint.', 400);
    }

    // 5. Create Razorpay order (paise)
    const rzpOrder = await razorpay.orders.create({
      amount: remainingUpi * 100,
      currency: 'INR',
      receipt: orderId,
      notes: {
        userId: req.user.id,
        shopId: transaction.shop_id,
        rewardPointsToRedeem: pointsToRedeem
      }
    });

    // 6. Update database transaction with reserved points and Razorpay ID
    await client.query(
      `UPDATE public.transactions 
       SET user_id = $1, 
           reward_points_used = $2, 
           reward_value_used = $3, 
           upi_paid = $4,
           razorpay_order_id = $5,
           updated_at = now()
       WHERE id = $6`,
      [req.user.id, pointsToRedeem, rewardValue, remainingUpi, rzpOrder.id, transaction.id]
    );

    await client.query('COMMIT');

    res.status(200).json({
      status: 'success',
      data: {
        razorpayOrderId: rzpOrder.id,
        amount: remainingUpi * 100, // paise
        currency: 'INR',
        razorpayKeyId: env.RAZORPAY_KEY_ID
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Error creating payment order:', err);
    next(err);
  } finally {
    client.release();
  }
}));

// 6. POST /api/payment/reward-only - Process 100% points-paid transaction (No Razorpay needed)
router.post('/payment/reward-only', requireAuth, asyncHandler(async (req, res, next) => {
  const { orderId, pointsToRedeem } = req.body;

  if (!orderId || !pointsToRedeem) {
    return next(new AppError('Order ID and points to redeem are required.', 400));
  }

  const points = parseInt(pointsToRedeem, 10);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock transaction row
    const txnRes = await client.query(
      'SELECT * FROM public.transactions WHERE order_id = $1 FOR UPDATE',
      [orderId]
    );

    if (txnRes.rows.length === 0) {
      throw new AppError('Transaction not found.', 404);
    }

    const transaction = txnRes.rows[0];

    if (transaction.status !== 'pending') {
      throw new AppError('Transaction is no longer pending.', 400);
    }

    if (new Date(transaction.expires_at) < new Date()) {
      throw new AppError('Transaction QR has expired.', 400);
    }

    // 2. Fetch shop rules
    const shopRes = await client.query(
      'SELECT redeem_points_per_rupee FROM public.shops WHERE id = $1',
      [transaction.shop_id]
    );
    const shop = shopRes.rows[0];

    // 3. Verify & lock customer points
    const userRes = await client.query(
      'SELECT points_balance FROM public.users WHERE id = $1 FOR UPDATE',
      [req.user.id]
    );
    const pointsBalance = userRes.rows[0].points_balance;

    if (pointsBalance < points) {
      throw new AppError('Insufficient points balance.', 400);
    }

    // Verify discount math
    const rewardValue = Math.floor(points / shop.redeem_points_per_rupee);
    if (rewardValue < transaction.amount) {
      throw new AppError('Reward points do not cover the full bill amount.', 400);
    }

    // 4. Deduct points from user
    await client.query(
      'UPDATE public.users SET points_balance = points_balance - $1 WHERE id = $2',
      [points, req.user.id]
    );

    // 5. Insert point log (negative record)
    await client.query(
      `INSERT INTO public.points_log (user_id, transaction_id, points_change, reason, created_at)
       VALUES ($1, $2, $3, 'reward_redeem', now())`,
      [req.user.id, transaction.id, -points]
    );

    // 6. Finalize transaction as paid by rewards
    const finalTxnRes = await client.query(
      `UPDATE public.transactions 
       SET user_id = $1, 
           status = 'reward_paid', 
           reward_points_used = $2, 
           reward_value_used = $3, 
           upi_paid = 0,
           updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [req.user.id, points, transaction.amount, transaction.id]
    );

    const updatedTxn = finalTxnRes.rows[0];

    await client.query('COMMIT');

    // Broadcast local realtime SSE notification to merchant
    broadcastTransactionUpdate(transaction.shop_id, updatedTxn);

    res.status(200).json({
      status: 'success',
      data: {
        transaction: updatedTxn
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Error processing reward-only payment:', err);
    next(err);
  } finally {
    client.release();
  }
}));

// 7. POST /api/webhook/razorpay - Razorpay webhook signature verification & point awards
router.post('/webhook/razorpay', express.raw({ type: 'application/json' }), asyncHandler(async (req, res, next) => {
  const signature = req.headers['x-razorpay-signature'];
  const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;

  // For Express.raw() rawBody is stored on req.body
  const rawBody = req.body.toString();
  const signatureVerified = verifyWebhookSignature(rawBody, signature, webhookSecret);

  if (!signatureVerified) {
    logger.error('Razorpay Webhook verification failed due to invalid signature');
    return res.status(400).send('Invalid signature');
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    return res.status(400).send('Invalid JSON payload');
  }

  logger.info(`Received verified Razorpay webhook event: ${event.event}`);

  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const payment = event.payload.payment.entity;
    const razorpayOrderId = payment.order_id;
    const razorpayPaymentId = payment.id;

    if (!razorpayOrderId) {
      return res.status(200).send('No order ID associated with payment');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock transaction row by razorpay_order_id
      const txnRes = await client.query(
        'SELECT * FROM public.transactions WHERE razorpay_order_id = $1 FOR UPDATE',
        [razorpayOrderId]
      );

      if (txnRes.rows.length === 0) {
        logger.warn(`No transaction found for Razorpay order ID: ${razorpayOrderId}`);
        await client.query('COMMIT');
        return res.status(200).send('Order not found');
      }

      const transaction = txnRes.rows[0];

      // Idempotency: check if already processed
      if (transaction.status === 'success' || transaction.status === 'partial_paid') {
        logger.info(`Webhook event already processed for order: ${transaction.order_id}`);
        await client.query('COMMIT');
        return res.status(200).send('Already processed');
      }

      // Fetch shop details for earn points formula
      const shopRes = await client.query(
        'SELECT earn_points_per_100 FROM public.shops WHERE id = $1',
        [transaction.shop_id]
      );
      const shop = shopRes.rows[0];

      // Lock user row
      const userRes = await client.query(
        'SELECT points_balance FROM public.users WHERE id = $1 FOR UPDATE',
        [transaction.user_id]
      );
      const user = userRes.rows[0];

      let newPointsBalance = user.points_balance;

      // 2. Deduct partial reward points if reserved
      if (transaction.reward_points_used > 0) {
        newPointsBalance -= transaction.reward_points_used;
        await client.query(
          `INSERT INTO public.points_log (user_id, transaction_id, points_change, reason, created_at)
           VALUES ($1, $2, $3, 'reward_redeem', now())`,
          [transaction.user_id, transaction.id, -transaction.reward_points_used]
        );
      }

      // 3. Calculate earned points based on upi_paid amount: floor(upi_paid / 100) * earn_rate
      const upiPaidAmt = transaction.upi_paid;
      const pointsEarned = Math.floor(upiPaidAmt / 100) * shop.earn_points_per_100;

      if (pointsEarned > 0) {
        newPointsBalance += pointsEarned;
        await client.query(
          `INSERT INTO public.points_log (user_id, transaction_id, points_change, reason, created_at)
           VALUES ($1, $2, $3, 'purchase', now())`,
          [transaction.user_id, transaction.id, pointsEarned]
        );
      }

      // Update user points balance in DB
      await client.query(
        'UPDATE public.users SET points_balance = $1 WHERE id = $2',
        [newPointsBalance, transaction.user_id]
      );

      // Determine final status
      const finalStatus = transaction.reward_points_used > 0 ? 'partial_paid' : 'success';

      // 4. Update transaction status
      const updatedTxnRes = await client.query(
        `UPDATE public.transactions 
         SET status = $1, razorpay_payment_id = $2, updated_at = now()
         WHERE id = $3
         RETURNING *`,
        [finalStatus, razorpayPaymentId, transaction.id]
      );

      const updatedTxn = updatedTxnRes.rows[0];

      await client.query('COMMIT');
      logger.info(`Finalized transaction: ${updatedTxn.order_id}. Earned points: ${pointsEarned}, Status: ${finalStatus}`);

      // Broadcast realtime SSE update to merchant dashboard
      broadcastTransactionUpdate(transaction.shop_id, updatedTxn);

    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Error inside Razorpay captured webhook transaction:', err);
      return res.status(500).send('Database transaction failed');
    } finally {
      client.release();
    }
  }

  res.status(200).send('OK');
}));

// 8. POST /api/payment/mock-complete - SIMULATOR endpoint for demo testing
// Allows frontend to trigger webhook event manually in mock mode!
router.post('/payment/mock-complete', requireAuth, asyncHandler(async (req, res, next) => {
  const { orderId, success } = req.body;

  if (!env.MOCK_SERVICES) {
    return next(new AppError('Simulator is only active in mock mode.', 403));
  }

  // Find transaction
  const txnRes = await pool.query(
    'SELECT * FROM public.transactions WHERE order_id = $1',
    [orderId]
  );

  if (txnRes.rows.length === 0) {
    return next(new AppError('Transaction not found.', 404));
  }

  const transaction = txnRes.rows[0];

  if (transaction.status !== 'pending') {
    return next(new AppError('Transaction is already processed.', 400));
  }

  if (success) {
    // Emulate webhook captured behavior
    const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 10)}`;
    const mockEvent = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            order_id: transaction.razorpay_order_id,
            id: mockPaymentId
          }
        }
      }
    };

    // Call webhook logic directly
    const signature = 'mock_signature';
    // Emulate POST request body
    const rawBody = JSON.stringify(mockEvent);

    // Call webhook route internally
    // We can simulate it by triggering the webhook processing logic
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const shopRes = await client.query(
        'SELECT earn_points_per_100 FROM public.shops WHERE id = $1',
        [transaction.shop_id]
      );
      const shop = shopRes.rows[0];

      const userRes = await client.query(
        'SELECT points_balance FROM public.users WHERE id = $1 FOR UPDATE',
        [transaction.user_id]
      );
      const user = userRes.rows[0];

      let newPointsBalance = user.points_balance;

      if (transaction.reward_points_used > 0) {
        newPointsBalance -= transaction.reward_points_used;
        await client.query(
          `INSERT INTO public.points_log (user_id, transaction_id, points_change, reason, created_at)
           VALUES ($1, $2, $3, 'reward_redeem', now())`,
          [transaction.user_id, transaction.id, -transaction.reward_points_used]
        );
      }

      const pointsEarned = Math.floor(transaction.upi_paid / 100) * shop.earn_points_per_100;
      if (pointsEarned > 0) {
        newPointsBalance += pointsEarned;
        await client.query(
          `INSERT INTO public.points_log (user_id, transaction_id, points_change, reason, created_at)
           VALUES ($1, $2, $3, 'purchase', now())`,
          [transaction.user_id, transaction.id, pointsEarned]
        );
      }

      await client.query(
        'UPDATE public.users SET points_balance = $1 WHERE id = $2',
        [newPointsBalance, transaction.user_id]
      );

      const finalStatus = transaction.reward_points_used > 0 ? 'partial_paid' : 'success';
      const updatedTxnRes = await client.query(
        `UPDATE public.transactions 
         SET status = $1, razorpay_payment_id = $2, updated_at = now()
         WHERE id = $3
         RETURNING *`,
        [finalStatus, mockPaymentId, transaction.id]
      );

      const updatedTxn = updatedTxnRes.rows[0];
      await client.query('COMMIT');

      broadcastTransactionUpdate(transaction.shop_id, updatedTxn);

      return res.status(200).json({
        status: 'success',
        message: 'Mock payment completed successfully.',
        data: {
          transaction: updatedTxn
        }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Error completing mock payment:', err);
      return next(err);
    } finally {
      client.release();
    }
  } else {
    // Mark failed
    const updatedTxnRes = await pool.query(
      `UPDATE public.transactions 
       SET status = 'failed', updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [transaction.id]
    );
    const updatedTxn = updatedTxnRes.rows[0];

    broadcastTransactionUpdate(transaction.shop_id, updatedTxn);

    return res.status(200).json({
      status: 'success',
      message: 'Mock payment marked failed.',
      data: {
        transaction: updatedTxn
      }
    });
  }
}));

// 9. GET /api/payment/details/:orderId - Retrieve details of any transaction
router.get('/payment/details/:orderId', requireAuth, asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  
  const txnRes = await pool.query(
    `SELECT t.*, s.name as shop_name, s.earn_points_per_100, s.redeem_points_per_rupee 
     FROM public.transactions t
     JOIN public.shops s ON s.id = t.shop_id
     WHERE t.order_id = $1`,
    [orderId]
  );
  
  if (txnRes.rows.length === 0) {
    return next(new AppError('Transaction not found.', 404));
  }
  
  const transaction = txnRes.rows[0];
  
  // Verify permissions: transaction must belong to current customer OR current merchant (shopkeeper owner)
  if (transaction.user_id !== req.user.id) {
    const shopRes = await pool.query('SELECT owner_id FROM public.shops WHERE id = $1', [transaction.shop_id]);
    if (shopRes.rows.length === 0 || shopRes.rows[0].owner_id !== req.user.id) {
      return next(new AppError('You are not authorized to view this transaction.', 403));
    }
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      transaction
    }
  });
}));

module.exports = router;
