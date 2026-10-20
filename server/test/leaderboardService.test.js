jest.mock('../db', () => ({
  getPool: jest.fn(),
}));

const { newDb } = require('pg-mem');
const { getPool } = require('../db');
const {
  getHouseholdLeaderboard,
  scoringRule,
} = require('../services/leaderboardService');

const HOUSEHOLD_ID = '11111111-1111-1111-1111-111111111111';
const MISSING_HOUSEHOLD_ID = '99999999-9999-9999-9999-999999999999';
const ALEX_ID = '22222222-2222-2222-2222-222222222222';
const BLAKE_ID = '33333333-3333-3333-3333-333333333333';
const CASEY_ID = '44444444-4444-4444-4444-444444444444';
const OUTSIDE_HOUSEHOLD_ID = '55555555-5555-5555-5555-555555555555';
const OUTSIDE_USER_ID = '66666666-6666-6666-6666-666666666666';

describe('leaderboard service with an in-memory PostgreSQL database', () => {
  let pool;

  beforeEach(async () => {
    jest.clearAllMocks();

    const database = newDb();
    const { Pool } = database.adapters.createPg();
    pool = new Pool();

    await pool.query(`
      CREATE TABLE households (
        id uuid PRIMARY KEY,
        name text NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY,
        household_id uuid,
        name text NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE chores (
        id uuid PRIMARY KEY,
        household_id uuid NOT NULL,
        title text NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE chore_instances (
        id uuid PRIMARY KEY,
        chore_id uuid NOT NULL,
        assignee_id uuid NOT NULL,
        status text NOT NULL,
        completed_at timestamp with time zone
      )
    `);

    getPool.mockReturnValue(pool);
  });

  afterEach(async () => {
    await pool.end();
  });

  test('calculates ranked scores from completed chores only', async () => {
    const choreA = '77777777-7777-7777-7777-777777777777';
    const choreB = '88888888-8888-8888-8888-888888888888';
    const choreC = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const outsideChore = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    await pool.query(`INSERT INTO households (id, name) VALUES ($1, $2), ($3, $4)`, [
      HOUSEHOLD_ID,
      'Main household',
      OUTSIDE_HOUSEHOLD_ID,
      'Outside household',
    ]);

    await pool.query(
      `INSERT INTO users (id, household_id, name)
       VALUES ($1, $2, $3), ($4, $5, $6), ($7, $8, $9), ($10, $11, $12)`,
      [
        ALEX_ID,
        HOUSEHOLD_ID,
        'Alex',
        BLAKE_ID,
        HOUSEHOLD_ID,
        'Blake',
        CASEY_ID,
        HOUSEHOLD_ID,
        'Casey',
        OUTSIDE_USER_ID,
        OUTSIDE_HOUSEHOLD_ID,
        'Outside',
      ],
    );

    await pool.query(
      `INSERT INTO chores (id, household_id, title)
       VALUES ($1, $2, 'Dishes'), ($3, $4, 'Vacuum'), ($5, $6, 'Laundry'), ($7, $8, 'Outside chore')`,
      [
        choreA,
        HOUSEHOLD_ID,
        choreB,
        HOUSEHOLD_ID,
        choreC,
        HOUSEHOLD_ID,
        outsideChore,
        OUTSIDE_HOUSEHOLD_ID,
      ],
    );

    await pool.query(
      `INSERT INTO chore_instances (id, chore_id, assignee_id, status, completed_at)
       VALUES
         ('00000000-0000-0000-0000-000000000001', $1, $2, 'completed', NULL),
         ('00000000-0000-0000-0000-000000000002', $1, $2, 'assigned', NOW()),
         ('00000000-0000-0000-0000-000000000003', $3, $4, 'complete', NULL),
         ('00000000-0000-0000-0000-000000000004', $5, $4, 'completed', NOW()),
         ('00000000-0000-0000-0000-000000000005', $7, $8, 'completed', NOW())`,
      [
        choreA,
        ALEX_ID,
        choreB,
        BLAKE_ID,
        choreC,
        CASEY_ID,
        outsideChore,
        OUTSIDE_USER_ID,
      ],
    );

    await expect(getHouseholdLeaderboard(HOUSEHOLD_ID)).resolves.toEqual({
      householdId: HOUSEHOLD_ID,
      scoringRule,
      leaderboard: [
        {
          rank: 1,
          roommateId: ALEX_ID,
          roommateName: 'Alex',
          points: 2,
          completedChores: 2,
        },
        {
          rank: 1,
          roommateId: BLAKE_ID,
          roommateName: 'Blake',
          points: 2,
          completedChores: 2,
        },
        {
          rank: 3,
          roommateId: CASEY_ID,
          roommateName: 'Casey',
          points: 0,
          completedChores: 0,
        },
      ],
    });
  });

  test('returns null when the household does not exist', async () => {
    await expect(getHouseholdLeaderboard(MISSING_HOUSEHOLD_ID)).resolves.toBeNull();
  });

  test('returns an empty leaderboard when the household has no members', async () => {
    await pool.query(`INSERT INTO households (id, name) VALUES ($1, $2)`, [
      HOUSEHOLD_ID,
      'Empty household',
    ]);

    await expect(getHouseholdLeaderboard(HOUSEHOLD_ID)).resolves.toEqual({
      householdId: HOUSEHOLD_ID,
      scoringRule,
      leaderboard: [],
    });
  });
});
