const connectPgSimple = require('connect-pg-simple');
const cors = require('cors');
const express = require('express');
const session = require('express-session');
const { checkDatabaseConnection, getPool } = require('./db');
const authRoutes = require('./routes/auth');
const weeklyBoardRoutes = require('./routes/weeklyBoardRoutes');
const profileRoutes = require('./routes/profileRoutes');

function createApp() {
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    throw new Error(
      'SESSION_SECRET is not configured. Copy .env.example to .env and add a secret.',
    );
  }

  const app = express();
  const PgSession = connectPgSimple(session);
  const isProduction = process.env.NODE_ENV === 'production';

  app.set('trust proxy', 1);
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(
    session({
      store: new PgSession({
        pool: getPool(),
        tableName: 'user_sessions',
        createTableIfMissing: false,
      }),
      name: 'choremate.sid',
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        sameSite: isProduction ? 'none' : 'lax',
        secure: isProduction,
      },
    }),
  );

  app.use('/auth', authRoutes);
  app.use('/api/households', weeklyBoardRoutes);

  app.get('/health', async (request, response) => {
    try {
      const { connected_at: connectedAt } = await checkDatabaseConnection();
      response
        .status(200)
        .json({ status: 'ok', database: 'connected', connectedAt });
    } catch (error) {
      console.error('Health check database failure.', { code: error.code });
      response.status(503).json({
        status: 'unavailable',
        database: 'disconnected',
        message:
          'The service cannot connect to its database. Verify the database configuration and availability.',
      });
    }
  });

  app.use('/api/profile', profileRoutes); //profile routes

  return app;
}

module.exports = { createApp };
