const express = require('express');
const { checkDatabaseConnection } = require('./db');
const householdRoutes = require('./routes/householdRoutes');
const weeklyBoardRoutes = require('./routes/weeklyBoardRoutes');

const app = express();
app.use(express.json());

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

app.use('/api/households', householdRoutes);
app.use('/api/households', weeklyBoardRoutes);

module.exports = app;

