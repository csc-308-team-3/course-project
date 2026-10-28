jest.mock('../server/db', () => ({
  getPool: jest.fn(),
}));

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn(),
}));

const { newDb } = require('pg-mem');
const { OAuth2Client } = require('google-auth-library');
const { getPool } = require('../server/db');
const {
  authenticateGoogleUser,
  authenticateUser,
} = require('../server/services/authService');

function createUserDatabase() {
  const database = newDb();
  const { Pool } = database.adapters.createPg();
  const pool = new Pool();

  return pool
    .query(
      `
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT '11111111-1111-1111-1111-111111111111',
        household_id uuid,
        name text NOT NULL,
        email text NOT NULL UNIQUE,
        password_hash text,
        google_subject text UNIQUE,
        score integer NOT NULL DEFAULT 0
      )
    `,
    )
    .then(() => pool);
}

describe('Google authentication service', () => {
  const verifyIdToken = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    OAuth2Client.mockImplementation(() => ({ verifyIdToken }));
  });

  test('creates a Google-only account from a verified token', async () => {
    const pool = await createUserDatabase();
    getPool.mockReturnValue(pool);
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: 'GOOGLE@EXAMPLE.COM',
        email_verified: true,
        name: 'Google User',
        sub: 'google-subject-1',
      }),
    });

    await expect(authenticateGoogleUser('google-id-token')).resolves.toEqual({
      email: 'google@example.com',
      householdId: null,
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Google User',
      score: 0,
    });
    await expect(
      pool.query('SELECT password_hash, google_subject FROM users'),
    ).resolves.toMatchObject({
      rows: [{ google_subject: 'google-subject-1', password_hash: null }],
    });
    expect(verifyIdToken).toHaveBeenCalledWith({
      audience: 'test-client-id',
      idToken: 'google-id-token',
    });

    await pool.end();
  });

  test('returns an existing user with the same Google subject', async () => {
    const pool = await createUserDatabase();
    getPool.mockReturnValue(pool);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, google_subject)
       VALUES ($1, $2, NULL, $3)`,
      ['Google User', 'google@example.com', 'google-subject-1'],
    );
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: 'google@example.com',
        email_verified: true,
        name: 'Updated Google Name',
        sub: 'google-subject-1',
      }),
    });

    await expect(
      authenticateGoogleUser('google-id-token'),
    ).resolves.toMatchObject({
      email: 'google@example.com',
      name: 'Google User',
    });
    await expect(
      pool.query('SELECT COUNT(*)::integer AS count FROM users'),
    ).resolves.toMatchObject({
      rows: [{ count: 1 }],
    });

    await pool.end();
  });

  test('rejects an unverified Google email before querying the database', async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: 'google@example.com',
        email_verified: false,
        name: 'Google User',
        sub: 'google-subject-1',
      }),
    });

    await expect(
      authenticateGoogleUser('google-id-token'),
    ).rejects.toMatchObject({
      code: 'GOOGLE_TOKEN_INVALID',
    });
    expect(getPool).not.toHaveBeenCalled();
  });

  test('rejects an existing local account with the same email', async () => {
    const pool = await createUserDatabase();
    getPool.mockReturnValue(pool);
    await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)`,
      ['Local User', 'local@example.com', 'password-hash'],
    );
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: 'local@example.com',
        email_verified: true,
        name: 'Google User',
        sub: 'google-subject-1',
      }),
    });

    await expect(
      authenticateGoogleUser('google-id-token'),
    ).rejects.toMatchObject({
      code: 'GOOGLE_ACCOUNT_CONFLICT',
    });

    await pool.end();
  });

  test('does not attempt password verification for a Google-only account', async () => {
    const pool = await createUserDatabase();
    getPool.mockReturnValue(pool);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, google_subject)
       VALUES ($1, $2, NULL, $3)`,
      ['Google User', 'google@example.com', 'google-subject-1'],
    );

    await expect(
      authenticateUser({
        email: 'google@example.com',
        password: 'password123',
      }),
    ).resolves.toBeNull();

    await pool.end();
  });
});
