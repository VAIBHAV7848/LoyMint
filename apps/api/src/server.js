const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { pool } = require('./config/db');

const PORT = env.PORT || 8080;

const startServer = async () => {
  try {
    // Test PostgreSQL database connection
    logger.info('Testing database connection...');
    await pool.query('SELECT 1');
    logger.info('Database connection established successfully!');
  } catch (err) {
    logger.error('Failed to connect to the database. Running in standalone memory mode/errors might occur if DB is not started.', err);
  }

  const server = app.listen(PORT, () => {
    logger.info(`Server is running in ${env.NODE_ENV} mode on port ${PORT}`);
    if (env.MOCK_SERVICES) {
      logger.info('Running with MOCK payment and geocoding services.');
    }
  });

  // Handle unhandled rejections and uncaught exceptions
  process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! Shutting down server...', err);
    server.close(() => {
      process.exit(1);
    });
  });

  process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION! Shutting down server...', err);
    server.close(() => {
      process.exit(1);
    });
  });
};

startServer();
