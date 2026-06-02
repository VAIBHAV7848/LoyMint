const { supabase, pool } = require('../config/db');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const env = require('../config/env');

const requireAuth = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Get token from header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please provide an authorization token.', 401));
  }

  let authUserId = null;
  let email = null;
  let mockUserRole = 'customer';
  let mockName = 'Mock User';

  // 2. Verify token
  if (token.startsWith('mock-token-')) {
    // Local testing fallback
    // Format: mock-token-<role>-<email_or_id>
    const parts = token.split('-');
    mockUserRole = parts[2] === 'merchant' ? 'shopkeeper' : 'customer';
    const identifier = parts.slice(3).join('-');

    if (identifier.includes('@')) {
      email = identifier;
      authUserId = 'mock-auth-id-' + identifier.replace(/[^a-zA-Z0-9]/g, '');
      mockName = identifier.split('@')[0];
    } else {
      // Default mock users
      if (mockUserRole === 'shopkeeper') {
        authUserId = 'b2222222-2222-2222-2222-222222222222';
        email = 'merchant@loymint.com';
        mockName = 'Vikram Seth';
      } else {
        authUserId = 'a1111111-1111-1111-1111-111111111111';
        email = 'customer@loymint.com';
        mockName = 'Rohan Sharma';
      }
    }
  } else {
    // Real Supabase validation
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      logger.error('Supabase auth check failed', error);
      return next(new AppError('Invalid token or session expired.', 401));
    }
    
    authUserId = user.id;
    email = user.email;
  }

  // 3. Fetch public user profile
  let userResult;
  if (token.startsWith('mock-token-') && email) {
    userResult = await pool.query(
      'SELECT * FROM public.users WHERE email = $1',
      [email]
    );
  } else {
    userResult = await pool.query(
      'SELECT * FROM public.users WHERE auth_user_id = $1',
      [authUserId]
    );
  }

  if (userResult.rows.length === 0) {
    // Only allow proceeding if the request is to complete the profile
    const currentPath = req.baseUrl + req.path;
    if (req.path === '/profile/complete' || currentPath === '/api/auth/profile/complete') {
      req.user = {
        authUserId,
        email,
        profileCompleted: false,
        role: mockUserRole,
        name: mockName
      };
      return next();
    }
    
    return next(new AppError('Unauthorized: Your user profile does not exist in the database.', 401));
  }

  const dbUser = userResult.rows[0];
  req.user = {
    id: dbUser.id,
    authUserId: dbUser.auth_user_id,
    role: dbUser.role,
    name: dbUser.name,
    email: dbUser.email,
    phone: dbUser.phone,
    pointsBalance: dbUser.points_balance,
    referralCode: dbUser.referral_code,
    profileCompleted: true
  };

  next();
});

module.exports = requireAuth;
