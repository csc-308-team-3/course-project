require('dotenv').config();

const app = require('./app');
const { checkDatabaseConnection, closeDatabaseConnection } = require('./db');

const port = Number.parseInt(process.env.PORT ?? '3000', 10);

async function startServer() {
  try {
    await checkDatabaseConnection();
    app.listen(port, () => {
      console.log(`ChoreMate backend listening on port ${port}.`);
    });
  } catch (error) {
    console.error(
      'Server startup failed: unable to connect to PostgreSQL. Verify DATABASE_URL, DATABASE_SSL, and database availability.',
      {
        code: error.code,
      },
    );
    await closeDatabaseConnection();
    process.exit(1);
  }
}

startServer();
