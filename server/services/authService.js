const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const { getPool } = require('../db');

const passwordRounds = 12;

function toPublicUser({ id, name, email, household_id: householdId, score }) {
  return { id, name, email, householdId, score };
}

async function createUser({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, passwordRounds);
  const result = await getPool().query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, household_id, score`,
    [name, email, passwordHash],
  );

  return toPublicUser(result.rows[0]);
}

async function authenticateUser({ email, password }) {
  const result = await getPool().query(
    `SELECT id, name, email, household_id, score, password_hash
     FROM users
     WHERE email = $1`,
    [email],
  );
  const user = result.rows[0];

  if (
    !user ||
    !user.password_hash ||
    !(await bcrypt.compare(password, user.password_hash))
  ) {
    return null;
  }

  return toPublicUser(user);
}

function getGoogleClientId() {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured.');
  }

  return clientId;
}

async function authenticateGoogleUser(credential) {
  const ticket = await new OAuth2Client().verifyIdToken({
    idToken: credential,
    audience: getGoogleClientId(),
  });
  const {
    email,
    email_verified: emailVerified,
    name,
    sub,
  } = ticket.getPayload();

  if (!email || !emailVerified || !name || !sub) {
    const error = new Error('Google token is missing required user details.');
    error.code = 'GOOGLE_TOKEN_INVALID';
    throw error;
  }

  const pool = getPool();
  const existingGoogleUser = await pool.query(
    `SELECT id, name, email, household_id, score
     FROM users
     WHERE google_subject = $1`,
    [sub],
  );

  if (existingGoogleUser.rows[0]) {
    return toPublicUser(existingGoogleUser.rows[0]);
  }

  const existingEmailUser = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()],
  );

  if (existingEmailUser.rows[0]) {
    const error = new Error('An account with that email already exists.');
    error.code = 'GOOGLE_ACCOUNT_CONFLICT';
    throw error;
  }

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, google_subject)
     VALUES ($1, $2, NULL, $3)
     RETURNING id, name, email, household_id, score`,
    [name, email.toLowerCase(), sub],
  );

  return toPublicUser(result.rows[0]);
}

async function getUserById(userId) {
  const result = await getPool().query(
    `SELECT id, name, email, household_id, score
     FROM users
     WHERE id = $1`,
    [userId],
  );

  return result.rows[0] ? toPublicUser(result.rows[0]) : null;
}

module.exports = {
  authenticateGoogleUser,
  authenticateUser,
  createUser,
  getUserById,
};
