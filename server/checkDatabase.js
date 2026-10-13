require('dotenv').config();

const { checkDatabaseConnection, closeDatabaseConnection } = require('./db');

async function main() {
  try {
    const { connected_at: connectedAt } = await checkDatabaseConnection();
    console.log(
      `Database connection verified at ${connectedAt.toISOString()}.`,
    );
  } catch (error) {
    console.error(
      'Database connection failed. Verify DATABASE_URL, DATABASE_SSL, and database availability.',
      {
        code: error.code,
      },
    );
    process.exitCode = 1;
  } finally {
    await closeDatabaseConnection();
  }
}

main();
