jest.mock('../server/db', () => ({
  getPool: jest.fn(),
}));

const { randomUUID } = require('node:crypto');
const { newDb } = require('pg-mem');
const { getPool } = require('../server/db');
const service = require('../server/services/choreHistoryService');
const { getMonthRange } = require('../server/utils/choreHistoryValidation');

const HOUSE = '11111111-1111-1111-1111-111111111111';
const OTHER_HOUSE = '22222222-2222-2222-2222-222222222222';
const ALEX = '33333333-3333-3333-3333-333333333333';
const SAM = '44444444-4444-4444-4444-444444444444';
const OUTSIDER = '55555555-5555-5555-5555-555555555555';
const CHORE = '66666666-6666-6666-6666-666666666666';
const OTHER_CHORE = '77777777-7777-7777-7777-777777777777';
const PAGE = { limit: 50, offset: 0 };

let pool;

beforeEach(async () => {
  jest.clearAllMocks();

  const database = newDb();
  const { Pool } = database.adapters.createPg();
  pool = new Pool();
  getPool.mockReturnValue(pool);

  await pool.query(`
    CREATE TABLE households (
      id uuid PRIMARY KEY,
      name text NOT NULL
    );

    CREATE TABLE users (
      id uuid PRIMARY KEY,
      household_id uuid REFERENCES households(id),
      name text NOT NULL
    );

    CREATE TABLE chores (
      id uuid PRIMARY KEY,
      household_id uuid NOT NULL REFERENCES households(id),
      title text NOT NULL,
      instructions text NOT NULL,
      estimated_duration integer NOT NULL CHECK (estimated_duration > 0),
      recurrence_frequency text NOT NULL
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
  `);

  await pool.query(
    `INSERT INTO households (id, name)
     VALUES ($1, 'Our House'), ($2, 'Other House')`,
    [HOUSE, OTHER_HOUSE],
  );

  await pool.query(
    `INSERT INTO users (id, household_id, name)
     VALUES ($1, $4, 'Alex'), ($2, $4, 'Sam'), ($3, $5, 'Taylor')`,
    [ALEX, SAM, OUTSIDER, HOUSE, OTHER_HOUSE],
  );

  await pool.query(
    `INSERT INTO chores (
       id, household_id, title, instructions,
       estimated_duration, recurrence_frequency
     )
     VALUES
       ($1, $3, 'Wash dishes', 'Wash everything.', 15, 'weekly'),
       ($2, $4, 'Vacuum', 'Vacuum the floor.', 20, 'weekly')`,
    [CHORE, OTHER_CHORE, HOUSE, OTHER_HOUSE],
  );
});

afterEach(async () => {
  await pool.end();
});

async function addInstance({
  choreId = CHORE,
  assigneeId = ALEX,
  completedAt = null,
  status = completedAt ? 'completed' : 'assigned',
} = {}) {
  const id = randomUUID();

  await pool.query(
    `INSERT INTO chore_instances (
       id, chore_id, assignee_id, due_date, due_time, status, completed_at
     )
     VALUES ($1, $2, $3, '2026-09-15', '18:30', $4, $5)`,
    [id, choreId, assigneeId, status, completedAt],
  );

  return id;
}

test('records completion and preserves its timestamp on retry', async () => {
  const id = await addInstance();

  const first = await service.completeChoreInstance(ALEX, HOUSE, id);

  expect(first.instance).toMatchObject({
    id,
    choreId: CHORE,
    assigneeId: ALEX,
    status: 'completed',
  });
  expect(first.instance.completedAt).not.toBeNull();

  const second = await service.completeChoreInstance(ALEX, HOUSE, id);

  expect(new Date(second.instance.completedAt).toISOString()).toBe(
    new Date(first.instance.completedAt).toISOString(),
  );

  const stored = await pool.query(
    'SELECT status, completed_at FROM chore_instances WHERE id = $1',
    [id],
  );

  expect(stored.rows[0].status).toBe('completed');
  expect(new Date(stored.rows[0].completed_at).toISOString()).toBe(
    new Date(first.instance.completedAt).toISOString(),
  );

  const history = await service.getChoreHistory(ALEX, HOUSE, CHORE, PAGE);
  expect(history.history).toHaveLength(1);
});

test('only the assigned roommate can complete an instance', async () => {
  const id = await addInstance({ assigneeId: SAM });

  await expect(
    service.completeChoreInstance(ALEX, HOUSE, id),
  ).rejects.toMatchObject({ status: 403 });

  const stored = await pool.query(
    'SELECT status, completed_at FROM chore_instances WHERE id = $1',
    [id],
  );

  expect(stored.rows[0]).toMatchObject({
    status: 'assigned',
    completed_at: null,
  });
});

test('rejects outsiders for completion, history, and statistics', async () => {
  const id = await addInstance();

  const requests = [
    () => service.completeChoreInstance(OUTSIDER, HOUSE, id),
    () => service.getChoreHistory(OUTSIDER, HOUSE, CHORE, PAGE),
    () =>
      service.getMonthlyStatistics(OUTSIDER, HOUSE, getMonthRange('2026-10')),
  ];

  for (const request of requests) {
    await expect(request()).rejects.toMatchObject({ status: 403 });
  }
});

test('rejects a user that no longer exists', async () => {
  await expect(
    service.getMonthlyStatistics(randomUUID(), HOUSE, getMonthRange('2026-10')),
  ).rejects.toMatchObject({ status: 401 });
});

test('does not expose another household’s instances or chores', async () => {
  const id = await addInstance({
    choreId: OTHER_CHORE,
    assigneeId: OUTSIDER,
  });

  await expect(
    service.completeChoreInstance(ALEX, HOUSE, id),
  ).rejects.toMatchObject({
    status: 404,
    message: 'Chore instance not found.',
  });

  await expect(
    service.getChoreHistory(ALEX, HOUSE, OTHER_CHORE, PAGE),
  ).rejects.toMatchObject({
    status: 404,
    message: 'Chore not found.',
  });

  await expect(
    service.completeChoreInstance(ALEX, HOUSE, randomUUID()),
  ).rejects.toMatchObject({ status: 404 });

  await expect(
    service.getChoreHistory(ALEX, HOUSE, randomUUID(), PAGE),
  ).rejects.toMatchObject({ status: 404 });
});

test.each(['complete', 'completed'])(
  'rejects legacy status %s without inventing a timestamp',
  async (status) => {
    const id = await addInstance({ status });

    await expect(
      service.completeChoreInstance(ALEX, HOUSE, id),
    ).rejects.toMatchObject({ status: 409 });

    const stored = await pool.query(
      'SELECT completed_at FROM chore_instances WHERE id = $1',
      [id],
    );

    expect(stored.rows[0].completed_at).toBeNull();
  },
);

test('returns empty history for an existing chore with no completions', async () => {
  await addInstance();

  const result = await service.getChoreHistory(ALEX, HOUSE, CHORE, PAGE);

  expect(result).toMatchObject({
    householdId: HOUSE,
    chore: { id: CHORE, title: 'Wash dishes' },
    limit: 50,
    offset: 0,
    history: [],
  });
});

test('history includes only timestamped completions, newest first', async () => {
  const older = await addInstance({
    completedAt: '2026-10-05T12:00:00Z',
  });
  const newer = await addInstance({
    assigneeId: SAM,
    completedAt: '2026-10-20T12:00:00Z',
  });
  await addInstance();
  await addInstance({ status: 'completed' });
  await addInstance({
    choreId: OTHER_CHORE,
    assigneeId: OUTSIDER,
    completedAt: '2026-10-25T12:00:00Z',
  });

  const result = await service.getChoreHistory(ALEX, HOUSE, CHORE, PAGE);

  expect(result.history.map((entry) => entry.instanceId)).toEqual([
    newer,
    older,
  ]);
  expect(result.history[0]).toMatchObject({
    memberId: SAM,
    memberName: 'Sam',
  });

  const nextPage = await service.getChoreHistory(ALEX, HOUSE, CHORE, {
    limit: 1,
    offset: 1,
  });

  expect(nextPage.history.map((entry) => entry.instanceId)).toEqual([older]);
});

test('monthly counts use UTC completion boundaries and include zeros', async () => {
  // due dates are all in September: counts must use completion dates
  await addInstance({ completedAt: '2026-10-01T00:00:00.000Z' });
  await addInstance({ completedAt: '2026-10-31T23:59:59.999Z' });
  await addInstance({ completedAt: '2026-09-30T23:59:59.999Z' });
  await addInstance({ completedAt: '2026-11-01T00:00:00.000Z' });
  await addInstance({ status: 'completed' });
  await addInstance();

  // even a record assigned to Alex must not count from another household
  await addInstance({
    choreId: OTHER_CHORE,
    assigneeId: ALEX,
    completedAt: '2026-10-10T12:00:00Z',
  });

  const result = await service.getMonthlyStatistics(
    ALEX,
    HOUSE,
    getMonthRange('2026-10'),
  );

  expect(result).toEqual({
    householdId: HOUSE,
    month: '2026-10',
    timezone: 'UTC',
    members: [
      { memberId: ALEX, memberName: 'Alex', completedCount: 2 },
      { memberId: SAM, memberName: 'Sam', completedCount: 0 },
    ],
  });

  const emptyMonth = await service.getMonthlyStatistics(
    ALEX,
    HOUSE,
    getMonthRange('2027-01'),
  );

  expect(emptyMonth.members.map((member) => member.completedCount)).toEqual([
    0, 0,
  ]);
});

test('monthly member counts exclude departed members', async () => {
  await addInstance({
    assigneeId: SAM,
    completedAt: '2026-10-10T12:00:00Z',
  });
  await pool.query('UPDATE users SET household_id = $1 WHERE id = $2', [
    OTHER_HOUSE,
    SAM,
  ]);

  const result = await service.getMonthlyStatistics(
    ALEX,
    HOUSE,
    getMonthRange('2026-10'),
  );

  expect(result.members).toEqual([
    { memberId: ALEX, memberName: 'Alex', completedCount: 0 },
  ]);
});

test('rolls back and releases the connection after a database error', async () => {
  const failure = new Error('Database unavailable');
  const client = {
    query: jest
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({ rows: [] }),
    release: jest.fn(),
  };
  getPool.mockReturnValue({
    connect: jest.fn().mockResolvedValue(client),
  });

  await expect(
    service.getMonthlyStatistics(ALEX, HOUSE, getMonthRange('2026-10')),
  ).rejects.toBe(failure);

  expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
  expect(client.release).toHaveBeenCalledTimes(1);
});
