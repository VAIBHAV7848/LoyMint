const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');
const AppError = require('./utils/AppError');
const env = require('./config/env');

const authRouter = require('./modules/auth/auth.routes');
const shopsRouter = require('./modules/shops/shops.routes');
const paymentsRouter = require('./modules/payments/payments.routes');
const usersRouter = require('./modules/users/users.routes');
const merchantRouter = require('./modules/merchant/merchant.routes');

const app = express();

// 1. Logger middleware
app.use(morgan('dev'));

// 2. CORS configuration
app.use(cors({
  origin: [env.CLIENT_ORIGIN, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

// 3. Mount raw parser for Razorpay webhook BEFORE express.json()
// This ensures signature verification receives the exact unmodified bytes
app.use('/api/webhook/razorpay', express.raw({ type: 'application/json' }));

// 4. Mount global JSON parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. Mount API modules
app.use('/api/auth', authRouter);
app.use('/api', shopsRouter);       // Mounts /api/shops/nearby, Single Shop, and Shop creation
app.use('/api', paymentsRouter);    // Mounts QR generation, Preview, initiating, Webhook, simulator, SSE
app.use('/api', usersRouter);       // Mounts Favorites, Saved offers, and customer Transactions/Logs
app.use('/api', merchantRouter);    // Mounts Merchant dashboard metrics and Offers CRUD

// 6. Handle undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 7. Mount Global Error Handler
app.use(errorHandler);

module.exports = app;
