const express = require('express');
const router = express.Router();
const { pool } = require('../../config/db');
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');

// Middleware to get the merchant's shop ID
const getMerchantShopId = async (req, res, next) => {
  const shopRes = await pool.query(
    'SELECT id FROM public.shops WHERE owner_id = $1',
    [req.user.id]
  );
  
  if (shopRes.rows.length === 0) {
    return next(new AppError('No shop profile found for this merchant. Please set up your shop first.', 404));
  }
  
  req.merchantShopId = shopRes.rows[0].id;
  next();
};

// 1. GET /api/merchant/dashboard - Dashboard metrics for merchant
router.get('/merchant/dashboard', requireAuth, requireRole('shopkeeper'), getMerchantShopId, asyncHandler(async (req, res) => {
  const shopId = req.merchantShopId;

  // 1. Fetch recent transactions
  const txnsRes = await pool.query(
    `SELECT t.*, u.name as customer_name 
     FROM public.transactions t
     LEFT JOIN public.users u ON u.id = t.user_id
     WHERE t.shop_id = $1
     ORDER BY t.created_at DESC
     LIMIT 10`,
    [shopId]
  );

  // 2. Aggregate metrics: total revenue, reward point discount value, counts
  const statsRes = await pool.query(
    `SELECT 
       COALESCE(SUM(amount), 0) as total_volume,
       COALESCE(SUM(upi_paid), 0) as total_upi_collected,
       COALESCE(SUM(reward_value_used), 0) as total_discount_given,
       COUNT(CASE WHEN status IN ('success', 'partial_paid', 'reward_paid') THEN 1 END) as paid_count,
       COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
     FROM public.transactions
     WHERE shop_id = $1`,
    [shopId]
  );

  const stats = statsRes.rows[0];

  res.status(200).json({
    status: 'success',
    data: {
      metrics: {
        totalVolume: parseInt(stats.total_volume, 10),
        upiCollected: parseInt(stats.total_upi_collected, 10),
        discountGiven: parseInt(stats.total_discount_given, 10),
        paidTransactions: parseInt(stats.paid_count, 10),
        pendingTransactions: parseInt(stats.pending_count, 10)
      },
      transactions: txnsRes.rows
    }
  });
}));

// 2. GET /api/merchant/offers - Get all offers for merchant shop
router.get('/merchant/offers', requireAuth, requireRole('shopkeeper'), getMerchantShopId, asyncHandler(async (req, res) => {
  const offersRes = await pool.query(
    'SELECT * FROM public.offers WHERE shop_id = $1 ORDER BY created_at DESC',
    [req.merchantShopId]
  );

  res.status(200).json({
    status: 'success',
    data: {
      offers: offersRes.rows
    }
  });
}));

// 3. POST /api/merchant/offers - Create new offer
router.post('/merchant/offers', requireAuth, requireRole('shopkeeper'), getMerchantShopId, asyncHandler(async (req, res, next) => {
  const { title, description, pointsRequired, rewardType, rewardValue, validUntil } = req.body;

  if (!title || !pointsRequired || !rewardType) {
    return next(new AppError('Title, points required, and reward type are required.', 400));
  }

  const insertRes = await pool.query(
    `INSERT INTO public.offers 
      (shop_id, title, description, points_required, reward_type, reward_value, valid_until, is_active, created_at)
     VALUES 
      ($1, $2, $3, $4, $5, $6, $7, true, now())
     RETURNING *`,
    [
      req.merchantShopId,
      title,
      description,
      parseInt(pointsRequired, 10),
      rewardType,
      rewardValue,
      validUntil ? new Date(validUntil) : null
    ]
  );

  res.status(201).json({
    status: 'success',
    data: {
      offer: insertRes.rows[0]
    }
  });
}));

// 4. PUT /api/merchant/offers/:offerId - Update offer
router.put('/merchant/offers/:offerId', requireAuth, requireRole('shopkeeper'), getMerchantShopId, asyncHandler(async (req, res, next) => {
  const { offerId } = req.params;
  const { title, description, pointsRequired, rewardType, rewardValue, validUntil, isActive } = req.body;

  // Verify offer belongs to merchant's shop
  const offerCheck = await pool.query(
    'SELECT id FROM public.offers WHERE id = $1 AND shop_id = $2',
    [offerId, req.merchantShopId]
  );

  if (offerCheck.rows.length === 0) {
    return next(new AppError('Offer not found or unauthorized.', 404));
  }

  const updateRes = await pool.query(
    `UPDATE public.offers 
     SET title = COALESCE($1, title), 
         description = COALESCE($2, description), 
         points_required = COALESCE($3, points_required), 
         reward_type = COALESCE($4, reward_type), 
         reward_value = COALESCE($5, reward_value), 
         valid_until = COALESCE($6, valid_until), 
         is_active = COALESCE($7, is_active)
     WHERE id = $8 AND shop_id = $9
     RETURNING *`,
    [
      title,
      description,
      pointsRequired ? parseInt(pointsRequired, 10) : null,
      rewardType,
      rewardValue,
      validUntil ? new Date(validUntil) : null,
      isActive !== undefined ? isActive : null,
      offerId,
      req.merchantShopId
    ]
  );

  res.status(200).json({
    status: 'success',
    data: {
      offer: updateRes.rows[0]
    }
  });
}));

// 5. DELETE /api/merchant/offers/:offerId - Delete offer
router.delete('/merchant/offers/:offerId', requireAuth, requireRole('shopkeeper'), getMerchantShopId, asyncHandler(async (req, res, next) => {
  const { offerId } = req.params;

  // Verify offer belongs to merchant's shop
  const offerCheck = await pool.query(
    'SELECT id FROM public.offers WHERE id = $1 AND shop_id = $2',
    [offerId, req.merchantShopId]
  );

  if (offerCheck.rows.length === 0) {
    return next(new AppError('Offer not found or unauthorized.', 404));
  }

  await pool.query(
    'DELETE FROM public.offers WHERE id = $1 AND shop_id = $2',
    [offerId, req.merchantShopId]
  );

  res.status(200).json({
    status: 'success',
    message: 'Offer deleted successfully.'
  });
}));

module.exports = router;
