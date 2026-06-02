const express = require('express');
const router = express.Router();
const axios = require('axios');
const { pool } = require('../../config/db');
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');
const env = require('../../config/env');

// 1. GET /api/shops/nearby - Find nearby shops using PostGIS distance calculations
router.get('/shops/nearby', requireAuth, asyncHandler(async (req, res, next) => {
  const { lat, lng, radius, category, search } = req.query;

  // Defaults: Bangalore city center if coordinates missing
  const latitude = parseFloat(lat || '12.9716');
  const longitude = parseFloat(lng || '77.5946');
  const radiusKm = parseFloat(radius || '10');

  let queryText = `
    SELECT
      s.id,
      s.name,
      s.category,
      s.address,
      s.earn_points_per_100,
      s.redeem_points_per_rupee,
      s.rating,
      s.upi_id,
      s.is_active,
      ST_Distance(
        s.location,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      ) / 1000 AS distance_km
    FROM public.shops s
    WHERE s.is_active = true
  `;

  const queryParams = [longitude, latitude];
  let paramCount = 2;

  // Filter by radius
  paramCount++;
  queryText += ` AND ST_DWithin(
    s.location,
    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
    $${paramCount} * 1000
  )`;
  queryParams.push(radiusKm);

  // Filter by category
  if (category && category !== 'All') {
    paramCount++;
    queryText += ` AND s.category = $${paramCount}`;
    queryParams.push(category);
  }

  // Filter by search text
  if (search) {
    paramCount++;
    queryText += ` AND (s.name ILIKE $${paramCount} OR s.address ILIKE $${paramCount})`;
    queryParams.push(`%${search}%`);
  }

  queryText += ` ORDER BY distance_km ASC`;

  const shopsRes = await pool.query(queryText, queryParams);

  res.status(200).json({
    status: 'success',
    results: shopsRes.rows.length,
    data: {
      shops: shopsRes.rows
    }
  });
}));

// 2. GET /api/shops/:shopId - Get details for a single shop + its offers
router.get('/shops/:shopId', requireAuth, asyncHandler(async (req, res, next) => {
  const { shopId } = req.params;

  const shopRes = await pool.query(
    `SELECT s.*, 
     u.name as owner_name 
     FROM public.shops s 
     JOIN public.users u ON u.id = s.owner_id 
     WHERE s.id = $1`,
    [shopId]
  );

  if (shopRes.rows.length === 0) {
    return next(new AppError('Shop not found.', 404));
  }

  const shop = shopRes.rows[0];

  // Fetch active offers for the shop
  const offersRes = await pool.query(
    'SELECT * FROM public.offers WHERE shop_id = $1 AND is_active = true AND (valid_until IS NULL OR valid_until > now())',
    [shopId]
  );

  res.status(200).json({
    status: 'success',
    data: {
      shop,
      offers: offersRes.rows
    }
  });
}));

// 3. POST /api/merchant/shop - Create or Update Merchant Shop Profile
router.post('/merchant/shop', requireAuth, requireRole('shopkeeper'), asyncHandler(async (req, res, next) => {
  const { name, address, category, earnPointsPer100, redeemPointsPerRupee, latitude, longitude, upiId } = req.body;

  if (!name || !address || !category || earnPointsPer100 === undefined || !redeemPointsPerRupee) {
    return next(new AppError('Please provide name, address, category, earn points, and redeem points rules.', 400));
  }

  let finalLat = parseFloat(latitude);
  let finalLng = parseFloat(longitude);

  // Attempt geocoding if coordinates not provided manually
  if (isNaN(finalLat) || isNaN(finalLng)) {
    try {
      logger.info(`Geocoding address using Nominatim: ${address}`);
      const geoRes = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: address,
          format: 'json',
          limit: 1
        },
        headers: {
          'User-Agent': env.NOMINATIM_USER_AGENT || 'LoyMintDemo/1.0 (contact@example.com)'
        },
        timeout: 5000
      });

      if (geoRes.data && geoRes.data.length > 0) {
        finalLat = parseFloat(geoRes.data[0].lat);
        finalLng = parseFloat(geoRes.data[0].lon);
        logger.info(`Geocoded coordinates: ${finalLat}, ${finalLng}`);
      } else {
        logger.warn('Nominatim returned empty results, falling back to Bangalore center');
        finalLat = 12.9716;
        finalLng = 77.5946;
      }
    } catch (err) {
      logger.error('OSM Nominatim Geocoding error, falling back to Bangalore center', err);
      finalLat = 12.9716;
      finalLng = 77.5946;
    }
  }

  // Check if shopkeeper already has a shop
  const existingShopRes = await pool.query(
    'SELECT id FROM public.shops WHERE owner_id = $1',
    [req.user.id]
  );

  let shop;

  if (existingShopRes.rows.length > 0) {
    // Update existing shop
    const shopId = existingShopRes.rows[0].id;
    const updateRes = await pool.query(
      `UPDATE public.shops 
       SET name = $1, address = $2, category = $3, 
           earn_points_per_100 = $4, redeem_points_per_rupee = $5,
           location = ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography,
           upi_id = $8
       WHERE id = $9
       RETURNING *`,
      [name, address, category, earnPointsPer100, redeemPointsPerRupee, finalLng, finalLat, upiId || '7349417848@ybl', shopId]
    );
    shop = updateRes.rows[0];
    logger.info(`Updated shop profile for shop: ${shop.id}`);
  } else {
    // Create new shop
    const insertRes = await pool.query(
      `INSERT INTO public.shops 
        (name, category, address, location, earn_points_per_100, redeem_points_per_rupee, owner_id, rating, is_active, upi_id, created_at)
       VALUES 
        ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6, $7, $8, 4.0, true, $9, now())
       RETURNING *`,
      [name, category, address, finalLng, finalLat, earnPointsPer100, redeemPointsPerRupee, req.user.id, upiId || '7349417848@ybl']
    );
    shop = insertRes.rows[0];
    logger.info(`Created new shop profile: ${shop.id}`);
  }

  res.status(200).json({
    status: 'success',
    data: {
      shop
    }
  });
}));

module.exports = router;
