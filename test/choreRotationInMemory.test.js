jest.mock('../server/db', () => ({
  getPool: jest.fn(),
}));

const { newDb, DataType } = require('pg-mem');
const { getPool } = require('../server/db');
const {
  generateChoreRotations,
} = require('../server/services/choreRotationService');

describe('chore rotation with an in-memory database', () => {
  test('creates alphabetical default rotations without duplicates', async () => {
    const database = newDb();

    database.public.registerFunction({
      name: 'to_char',
      args: [DataType.date, DataType.text],
      returns: DataType.text,
      implementation: (date) => new Date(date).toISOString().slice(0, 10),
    });

    const { Pool } = database.adapters.createPg();
    const pool = new Pool();

    await pool.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY,
        household_id uuid NOT NULL,
        name text NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE chores (
        id uuid PRIMARY KEY,
        household_id uuid NOT NULL,
        title text NOT NULL,
        recurrence_frequency text NOT NULL,
        recurrence_start_date date
      )
    `);

    await pool.query(`
      CREATE TABLE chore_rotations (
        chore_id uuid NOT NULL,
        user_id uuid NOT NULL,
        position integer NOT NULL,
        PRIMARY KEY (chore_id, user_id),
        UNIQUE (chore_id, position)
      )
    `);

    await pool.query(`
      CREATE TABLE chore_instances (
        id uuid PRIMARY KEY,
        chore_id uuid NOT NULL,
        assignee_id uuid NOT NULL,
        due_date date NOT NULL,
        status text NOT NULL
      )
    `);

    const householdId = '11111111-1111-1111-1111-111111111111';
    const chrisId = '22222222-2222-2222-2222-222222222222';
    const garyId = '33333333-3333-3333-3333-333333333333';
    const choreId = '44444444-4444-4444-4444-444444444444';

    await pool.query(
      `INSERT INTO users (id, household_id, name) VALUES
        ($1, $2, $3),
        ($4, $2, $5)`,
      [chrisId, householdId, 'Chris Zielke', garyId, 'Gary Chiu'],
    );

    await pool.query(
      `INSERT INTO chores (
        id,
        household_id,
        title,
        recurrence_frequency,
        recurrence_start_date
      )
      VALUES ($1, $2, $3, $4, $5)`,
      [
        choreId,
        householdId,
        'Wash dishes',
        'weekly',
        '2026-10-12',
      ],
    );

    getPool.mockReturnValue(pool);

    const firstResult = await generateChoreRotations(
      chrisId,
      householdId,
      {
        startDate: '2026-10-12',
        endDate: '2026-10-26',
      },
    );

    expect(firstResult.generatedCount).toBe(3);
    expect(firstResult.skippedChores).toEqual([]);

    const assignments = await pool.query(`
      SELECT
        assignee_id AS "assigneeId",
        TO_CHAR(due_date, 'YYYY-MM-DD') AS "dueDate"
      FROM chore_instances
      ORDER BY due_date
    `);

    expect(assignments.rows).toEqual([
      { assigneeId: chrisId, dueDate: '2026-10-12' },
      { assigneeId: garyId, dueDate: '2026-10-19' },
      { assigneeId: chrisId, dueDate: '2026-10-26' },
    ]);

    const secondResult = await generateChoreRotations(
      chrisId,
      householdId,
      {
        startDate: '2026-10-12',
        endDate: '2026-10-26',
      },
    );

    expect(secondResult.generatedCount).toBe(0);

    await pool.end();
  });
});