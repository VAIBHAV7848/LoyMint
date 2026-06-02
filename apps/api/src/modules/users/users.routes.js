const express = require('express');
const router = express.Router();
const { pool } = require('../../config/db');
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');

// 1. GET /api/user/transactions - Fetch customer's own transaction history
router.get('/user/transactions', requireAuth, requireRole('customer'), asyncHandler(async (req, res) => {
  const txnRes = await pool.query(
    `SELECT t.*, s.name as shop_name, s.category as shop_category 
     FROM public.transactions t 
     JOIN public.shops s ON s.id = t.shop_id 
     WHERE t.user_id = $1
     ORDER BY t.created_at DESC`,
    [req.user.id]
  );

  res.status(200).json({
    status: 'success',
    data: {
      transactions: txnRes.rows
    }
  });
}));

// 2. GET /api/user/points-log - Fetch customer's points ledger log
router.get('/user/points-log', requireAuth, requireRole('customer'), asyncHandler(async (req, res) => {
  const logRes = await pool.query(
    `SELECT pl.*, t.order_id, s.name as shop_name 
     FROM public.points_log pl 
     LEFT JOIN public.transactions t ON t.id = pl.transaction_id
     LEFT JOIN public.shops s ON s.id = t.shop_id
     WHERE pl.user_id = $1
     ORDER BY pl.created_at DESC`,
    [req.user.id]
  );

  res.status(200).json({
    status: 'success',
    data: {
      logs: logRes.rows
    }
  });
}));

// 3. POST /api/user/favorites/:shopId - Favorite a shop
router.post('/user/favorites/:shopId', requireAuth, requireRole('customer'), asyncHandler(async (req, res, next) => {
  const { shopId } = req.params;

  // Verify shop exists
  const shopCheck = await pool.query('SELECT id FROM public.shops WHERE id = $1', [shopId]);
  if (shopCheck.rows.length === 0) {
    return next(new AppError('Shop not found.', 404));
  }

  await pool.query(
    `INSERT INTO public.favorite_shops (user_id, shop_id, created_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id, shop_id) DO NOTHING`,
    [req.user.id, shopId]
  );

  res.status(200).json({
    status: 'success',
    message: 'Shop added to favorites.'
  });
}));

// 4. DELETE /api/user/favorites/:shopId - Unfavorite a shop
router.delete('/user/favorites/:shopId', requireAuth, requireRole('customer'), asyncHandler(async (req, res) => {
  const { shopId } = req.params;

  await pool.query(
    'DELETE FROM public.favorite_shops WHERE user_id = $1 AND shop_id = $2',
    [req.user.id, shopId]
  );

  res.status(200).json({
    status: 'success',
    message: 'Shop removed from favorites.'
  });
}));

// 5. GET /api/user/favorites - List favorite shops
router.get('/user/favorites', requireAuth, requireRole('customer'), asyncHandler(async (req, res) => {
  const favsRes = await pool.query(
    `SELECT s.* 
     FROM public.favorite_shops fs
     JOIN public.shops s ON s.id = fs.shop_id
     WHERE fs.user_id = $1`,
    [req.user.id]
  );

  res.status(200).json({
    status: 'success',
    data: {
      shops: favsRes.rows
    }
  });
}));

// 6. POST /api/user/saved-offers/:offerId - Save a shop offer
router.post('/user/saved-offers/:offerId', requireAuth, requireRole('customer'), asyncHandler(async (req, res, next) => {
  const { offerId } = req.params;

  // Verify offer exists
  const offerCheck = await pool.query('SELECT id FROM public.offers WHERE id = $1', [offerId]);
  if (offerCheck.rows.length === 0) {
    return next(new AppError('Offer not found.', 404));
  }

  await pool.query(
    `INSERT INTO public.saved_offers (user_id, offer_id, saved_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id, offer_id) DO NOTHING`,
    [req.user.id, offerId]
  );

  res.status(200).json({
    status: 'success',
    message: 'Offer saved successfully.'
  });
}));

// 7. DELETE /api/user/saved-offers/:offerId - Unsave a shop offer
router.delete('/user/saved-offers/:offerId', requireAuth, requireRole('customer'), asyncHandler(async (req, res) => {
  const { offerId } = req.params;

  await pool.query(
    'DELETE FROM public.saved_offers WHERE user_id = $1 AND offer_id = $2',
    [req.user.id, offerId]
  );

  res.status(200).json({
    status: 'success',
    message: 'Offer unsaved.'
  });
}));

// 8. GET /api/user/saved-offers - List saved offers
router.get('/user/saved-offers', requireAuth, requireRole('customer'), asyncHandler(async (req, res) => {
  const offersRes = await pool.query(
    `SELECT o.*, s.name as shop_name 
     FROM public.saved_offers so
     JOIN public.offers o ON o.id = so.offer_id
     JOIN public.shops s ON s.id = o.shop_id
     WHERE so.user_id = $1`,
    [req.user.id]
  );

  res.status(200).json({
    status: 'success',
    data: {
      offers: offersRes.rows
    }
  });
}));

module.exports = router;
