const express = require('express');
const router = express.Router();
const { pool } = require('../../config/db');
const requireAuth = require('../../middleware/requireAuth');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');

// 1. GET /api/me - Retrieve current user profile
router.get('/me', requireAuth, asyncHandler(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  });
}));

// 2. POST /api/profile/complete - Complete user profile
router.post('/profile/complete', requireAuth, asyncHandler(async (req, res, next) => {
  const { name, role, referralCode } = req.body;

  if (!name || !role) {
    return next(new AppError('Name and role are required.', 400));
  }

  if (!['customer', 'shopkeeper'].includes(role)) {
    return next(new AppError('Invalid role. Must be either customer or shopkeeper.', 400));
  }

  if (req.user.profileCompleted) {
    return next(new AppError('Profile is already completed.', 400));
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Generate user's own referral code
    const sanitizedName = name.replace(/[^a-zA-Z]/g, '').substring(0, 5).toUpperCase();
    const randomDigits = Math.floor(100 + Math.random() * 900);
    const myReferralCode = `${sanitizedName}${randomDigits}` || `LOYM${Math.floor(1000 + Math.random() * 9000)}`;

    let referredById = null;
    let awardReferralBonus = false;

    // Check optional referral code
    if (referralCode) {
      const referrerRes = await client.query(
        'SELECT id, points_balance FROM public.users WHERE referral_code = $1',
        [referralCode.trim().toUpperCase()]
      );

      if (referrerRes.rows.length > 0) {
        const referrer = referrerRes.rows[0];
        referredById = referrer.id;
        awardReferralBonus = true;
        logger.info(`Applying referral bonus for new user. Referrer: ${referrer.id}`);
      } else {
        logger.warn(`Referral code ${referralCode} provided but no matching user found.`);
      }
    }

    // Insert user profile into public.users
    const insertRes = await client.query(
      `INSERT INTO public.users 
        (auth_user_id, role, name, email, points_balance, referral_code, referred_by, created_at, updated_at)
       VALUES 
        ($1, $2, $3, $4, $5, $6, $7, now(), now())
       RETURNING *`,
      [
        req.user.authUserId,
        role,
        name,
        req.user.email,
        awardReferralBonus ? 50 : 0, // Give 50 bonus points to new user if referred
        myReferralCode,
        referredById
      ]
    );

    const newUser = insertRes.rows[0];

    // Award bonus to referrer and log both points
    if (awardReferralBonus && referredById) {
      // 1. Credit referrer
      await client.query(
        'UPDATE public.users SET points_balance = points_balance + 50 WHERE id = $1',
        [referredById]
      );

      // 2. Insert point logs
      await client.query(
        `INSERT INTO public.points_log (user_id, points_change, reason, created_at)
         VALUES ($1, 50, 'referral_bonus', now()), ($2, 50, 'referral_bonus', now())`,
        [referredById, newUser.id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: newUser.id,
          authUserId: newUser.auth_user_id,
          role: newUser.role,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          pointsBalance: newUser.points_balance,
          referralCode: newUser.referral_code,
          profileCompleted: true
        }
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Error completing profile:', err);
    next(err);
  } finally {
    client.release();
  }
}));

module.exports = router;
