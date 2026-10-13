const { Pool } = require('pg');

function getDatabaseConfig() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not configured. Copy .env.example to .env and add a connection string.',
    );
  }

  return {
    connectionString,
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false }
        : undefined,
  };
}

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      ...getDatabaseConfig(),
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }

  return pool;
}

async function checkDatabaseConnection() {
  const result = await getPool().query('SELECT NOW() AS connected_at');
  return result.rows[0];
}

async function closeDatabaseConnection() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = { checkDatabaseConnection, closeDatabaseConnection, getPool };
