const bcrypt = require('bcryptjs');
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

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return null;
  }

  return toPublicUser(user);
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

module.exports = { authenticateUser, createUser, getUserById };
