jest.mock('../db', () => ({
  getPool: jest.fn(),
}));

const { newDb } = require('pg-mem');
const { getPool } = require('../db');
const householdService = require('../services/householdService');

const HOUSEHOLD_ID = '11111111-1111-1111-1111-111111111111';
const SECOND_HOUSEHOLD_ID = '22222222-2222-2222-2222-222222222222';
const OWNER_ID = '33333333-3333-3333-3333-333333333333';
const MEMBER_ID = '44444444-4444-4444-4444-444444444444';
const OUTSIDER_ID = '55555555-5555-5555-5555-555555555555';

async function addUser(pool, id, householdId = null) {
  await pool.query(
    `INSERT INTO users (id, household_id, name, email, password_hash)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, householdId, `User ${id}`, `${id}@example.test`, 'hash'],
  );
}

async function addHousehold(pool, id, inviteCode = 'JOINME') {
  await pool.query(
    'INSERT INTO households (id, name, invite_code) VALUES ($1, $2, $3)',
    [id, `Household ${id}`, inviteCode],
  );
}

describe('household service with an in-memory PostgreSQL database', () => {
  let pool;

  beforeEach(async () => {
    jest.clearAllMocks();

    const database = newDb();
    const { Pool } = database.adapters.createPg();
    pool = new Pool();

    await pool.query(`
      CREATE TABLE households (
        id text PRIMARY KEY,
        name text NOT NULL,
        invite_code text NOT NULL UNIQUE
      )
    `);
    await pool.query(`
      CREATE TABLE users (
        id text PRIMARY KEY,
        household_id text,
        name text NOT NULL,
        email text NOT NULL UNIQUE,
        password_hash text NOT NULL
      )
    `);

    getPool.mockReturnValue(pool);
  });

  afterEach(async () => {
    await pool.end();
  });

  test('creates a household, attaches its creator, and returns its invite code', async () => {
    await addUser(pool, OWNER_ID);

    const household = await householdService.createHousehold(OWNER_ID, {
      name: 'Roommates',
    });

    expect(household).toEqual({
      id: expect.any(String),
      name: 'Roommates',
      inviteCode: expect.stringMatching(/^[0-9A-F]{10}$/),
      members: [OWNER_ID],
    });

    const membership = await pool.query(
      'SELECT household_id FROM users WHERE id = $1',
      [OWNER_ID],
    );
    expect(membership.rows[0].household_id).toBe(household.id);
  });

  test('prevents a user from creating or joining a second household', async () => {
    await addHousehold(pool, HOUSEHOLD_ID, 'JOINME');
    await addHousehold(pool, SECOND_HOUSEHOLD_ID, 'SECOND');
    await addUser(pool, OWNER_ID, HOUSEHOLD_ID);

    await expect(
      householdService.createHousehold(OWNER_ID, { name: 'Another house' }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'You already belong to a household.',
    });
    await expect(
      householdService.joinHousehold(OWNER_ID, 'SECOND'),
    ).rejects.toMatchObject({
      status: 409,
      message: 'You already belong to a household.',
    });
  });

  test('joins a valid invite code and rejects an unknown code', async () => {
    await addHousehold(pool, HOUSEHOLD_ID, 'JOINME');
    await addUser(pool, OWNER_ID, HOUSEHOLD_ID);
    await addUser(pool, MEMBER_ID);
    await addUser(pool, OUTSIDER_ID);

    await expect(
      householdService.joinHousehold(OUTSIDER_ID, 'MISSING'),
    ).rejects.toMatchObject({ status: 404, message: 'Wrong invite code.' });

    const household = await householdService.joinHousehold(MEMBER_ID, 'JOINME');

    expect(household).toEqual({
      id: HOUSEHOLD_ID,
      name: `Household ${HOUSEHOLD_ID}`,
      inviteCode: 'JOINME',
      members: [OWNER_ID, MEMBER_ID],
    });
  });

  test('returns only the current users household', async () => {
    await addHousehold(pool, HOUSEHOLD_ID, 'JOINME');
    await addHousehold(pool, SECOND_HOUSEHOLD_ID, 'SECOND');
    await addUser(pool, OWNER_ID, HOUSEHOLD_ID);
    await addUser(pool, MEMBER_ID, SECOND_HOUSEHOLD_ID);

    await expect(householdService.getCurrentHousehold(OUTSIDER_ID)).rejects.toMatchObject({
      status: 401,
    });

    await expect(householdService.getCurrentHousehold(OWNER_ID)).resolves.toEqual({
      id: HOUSEHOLD_ID,
      name: `Household ${HOUSEHOLD_ID}`,
      inviteCode: 'JOINME',
      members: [OWNER_ID],
    });
  });

  test('leaves a multi-member household without deleting it', async () => {
    await addHousehold(pool, HOUSEHOLD_ID);
    await addUser(pool, OWNER_ID, HOUSEHOLD_ID);
    await addUser(pool, MEMBER_ID, HOUSEHOLD_ID);

    await householdService.leaveHousehold(MEMBER_ID, HOUSEHOLD_ID);

    const users = await pool.query(
      'SELECT id, household_id FROM users ORDER BY id',
    );
    expect(users.rows).toEqual([
      { id: OWNER_ID, household_id: HOUSEHOLD_ID },
      { id: MEMBER_ID, household_id: null },
    ]);
    await expect(householdService.getCurrentHousehold(OWNER_ID)).resolves.not.toBeNull();
  });

  test('deletes a household when its final member leaves and rejects outsiders', async () => {
    await addHousehold(pool, HOUSEHOLD_ID);
    await addUser(pool, OWNER_ID, HOUSEHOLD_ID);
    await addUser(pool, OUTSIDER_ID);

    await expect(
      householdService.leaveHousehold(OUTSIDER_ID, HOUSEHOLD_ID),
    ).rejects.toMatchObject({ status: 403 });

    await householdService.leaveHousehold(OWNER_ID, HOUSEHOLD_ID);

    const household = await pool.query('SELECT id FROM households WHERE id = $1', [
      HOUSEHOLD_ID,
    ]);
    expect(household.rows).toEqual([]);
    await expect(householdService.getCurrentHousehold(OWNER_ID)).resolves.toBeNull();
  });

  test('rotates an invite code and invalidates the previous code', async () => {
    await addHousehold(pool, HOUSEHOLD_ID, 'OLD-CODE');
    await addUser(pool, OWNER_ID, HOUSEHOLD_ID);
    await addUser(pool, MEMBER_ID);

    const household = await householdService.rotateInviteCode(OWNER_ID, HOUSEHOLD_ID);

    expect(household.inviteCode).toMatch(/^[0-9A-F]{10}$/);
    expect(household.inviteCode).not.toBe('OLD-CODE');
    await expect(
      householdService.joinHousehold(MEMBER_ID, 'OLD-CODE'),
    ).rejects.toMatchObject({ status: 404, message: 'Wrong invite code.' });
  });
});
