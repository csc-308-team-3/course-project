jest.mock('../server/db', () => ({
  getPool: jest.fn(),
}));

const { newDb } = require('pg-mem');
const { getPool } = require('../server/db');
const { createChore } = require('../server/services/choreService');

const HOUSEHOLD_ID = '11111111-1111-1111-1111-111111111111';
const CREATOR_ID = '22222222-2222-2222-2222-222222222222';
const ASSIGNEE_ID = '33333333-3333-3333-3333-333333333333';
const OTHER_HOUSEHOLD_ID = '44444444-4444-4444-4444-444444444444';

const validInput = {
  title: 'Wash dishes',
  category: 'Kitchen',
  instructions: 'Wash and put away the dishes.',
  assigneeId: ASSIGNEE_ID,
  dueDate: '2026-10-26',
  recurrenceFrequency: 'one-time',
  recurrenceStartDate: null,
  estimatedDuration: 15,
  dueTime: '18:30',
};

let pool;

beforeEach(async () => {
  jest.clearAllMocks();

  const database = newDb();
  const adapter = database.adapters.createPg();
  pool = new adapter.Pool();

  await pool.query(`
    CREATE TABLE users (
      id uuid PRIMARY KEY,
      household_id uuid,
      name text NOT NULL
    );

CREATE TABLE chores (
  id uuid PRIMARY KEY,
  household_id uuid NOT NULL,
  title text NOT NULL,
  category text,
  instructions text NOT NULL,
  estimated_duration integer NOT NULL CHECK (estimated_duration > 0),
  recurrence_frequency text NOT NULL,
  recurrence_start_date date
);

    CREATE TABLE chore_instances (
  id uuid PRIMARY KEY,
  chore_id uuid NOT NULL REFERENCES chores(id),
  assignee_id uuid NOT NULL REFERENCES users(id),
  due_date date NOT NULL,
  due_time time NOT NULL,
  status text NOT NULL,
  completed_at timestamp with time zone
);

    CREATE TABLE chore_rotations (
      chore_id uuid NOT NULL REFERENCES chores(id),
      user_id uuid NOT NULL REFERENCES users(id),
      position integer NOT NULL CHECK (position > 0),
      PRIMARY KEY (chore_id, user_id),
      UNIQUE (chore_id, position)
    );
  `);

  await pool.query(
    `INSERT INTO users (id, household_id, name)
     VALUES ($1, $3, 'Alex'), ($2, $3, 'Sam')`,
    [CREATOR_ID, ASSIGNEE_ID, HOUSEHOLD_ID],
  );

  getPool.mockReturnValue(pool);
});

afterEach(async () => {
  await pool.end();
});

test('saves a one-time chore and its first assignment', async () => {
  const result = await createChore(CREATOR_ID, HOUSEHOLD_ID, validInput);

  const chores = await pool.query('SELECT * FROM chores');
  const instances = await pool.query('SELECT * FROM chore_instances');
  const rotations = await pool.query('SELECT * FROM chore_rotations');

  expect(chores.rows).toHaveLength(1);
  expect(chores.rows[0]).toMatchObject({
    id: result.chore.id,
    household_id: HOUSEHOLD_ID,
    title: validInput.title,
    instructions: validInput.instructions,
    recurrence_frequency: 'one-time',
    recurrence_start_date: null,
  });

  expect(instances.rows).toHaveLength(1);
  expect(instances.rows[0]).toMatchObject({
    chore_id: result.chore.id,
    assignee_id: ASSIGNEE_ID,
    status: 'assigned',
  });
  expect(new Date(instances.rows[0].due_date).toISOString().slice(0, 10)).toBe(
    validInput.dueDate,
  );

  expect(rotations.rows).toHaveLength(0);

  expect(chores.rows[0].estimated_duration).toBe(15);
  expect(instances.rows[0].due_time).toBe('18:30:00');

  expect(result.chore.estimatedDuration).toBe(15);
  expect(result.instance.dueTime).toBe('18:30');
});

test.each(['daily', 'weekly', 'monthly'])(
  'saves a %s chore with the selected assignee first in rotation',
  async (frequency) => {
    const result = await createChore(CREATOR_ID, HOUSEHOLD_ID, {
      ...validInput,
      recurrenceFrequency: frequency,
      recurrenceStartDate: validInput.dueDate,
    });

    const chores = await pool.query('SELECT * FROM chores');
    const rotations = await pool.query(
      'SELECT user_id, position FROM chore_rotations ORDER BY position',
    );

    expect(chores.rows[0].recurrence_frequency).toBe(frequency);
    expect(
      new Date(chores.rows[0].recurrence_start_date).toISOString().slice(0, 10),
    ).toBe(validInput.dueDate);

    expect(rotations.rows).toEqual([
      { user_id: ASSIGNEE_ID, position: 1 },
      { user_id: CREATOR_ID, position: 2 },
    ]);

    expect(result.instance.assigneeId).toBe(ASSIGNEE_ID);
  },
);

test('rejects creation in another household without inserting a chore', async () => {
  await expect(
    createChore(CREATOR_ID, OTHER_HOUSEHOLD_ID, validInput),
  ).rejects.toMatchObject({ status: 403 });

  const chores = await pool.query('SELECT * FROM chores');
  expect(chores.rows).toHaveLength(0);
});

test('rejects an assignee from another household', async () => {
  await pool.query('UPDATE users SET household_id = $1 WHERE id = $2', [
    OTHER_HOUSEHOLD_ID,
    ASSIGNEE_ID,
  ]);

  await expect(
    createChore(CREATOR_ID, HOUSEHOLD_ID, validInput),
  ).rejects.toMatchObject({ status: 400 });

  const chores = await pool.query('SELECT * FROM chores');
  expect(chores.rows).toHaveLength(0);
});
