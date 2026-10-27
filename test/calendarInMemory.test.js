jest.mock('../server/db', () => ({
  getPool: jest.fn(),
}));

const { newDb, DataType } = require('pg-mem');
const { getPool } = require('../server/db');
const {
  getCalendarChores,
} = require('../server/services/calendarService');

describe('calendar service with an in-memory PostgreSQL database', () => {
  test('returns only chores due within the selected date range', async () => {
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
        household_id uuid,
        name text NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE chores (
        id uuid PRIMARY KEY,
        household_id uuid NOT NULL,
        title text NOT NULL,
        category text
      )
    `);

    await pool.query(`
      CREATE TABLE chore_instances (
        id uuid PRIMARY KEY,
        chore_id uuid NOT NULL,
        assignee_id uuid NOT NULL,
        due_date date NOT NULL,
        status text NOT NULL,
        completed_at timestamp with time zone
      )
    `);

    const householdId = '11111111-1111-1111-1111-111111111111';
    const chrisId = '22222222-2222-2222-2222-222222222222';
    const garyId = '33333333-3333-3333-3333-333333333333';

    await pool.query(
      `INSERT INTO users (id, household_id, name)
       VALUES ($1, $2, $3), ($4, $2, $5)`,
      [chrisId, householdId, 'Chris Zielke', garyId, 'Gary Chiu'],
    );

    await pool.query(
      `INSERT INTO chores (id, household_id, title, category)
       VALUES
         ('44444444-4444-4444-4444-444444444444', $1, 'Wash dishes', 'Kitchen'),
         ('55555555-5555-5555-5555-555555555555', $1, 'Buy groceries', 'Shopping'),
         ('66666666-6666-6666-6666-666666666666', $1, 'Old chore', 'Cleaning')`,
      [householdId],
    );

    await pool.query(
      `INSERT INTO chore_instances
       (id, chore_id, assignee_id, due_date, status)
       VALUES
         ('77777777-7777-7777-7777-777777777777',
          '44444444-4444-4444-4444-444444444444',
          $1, '2026-10-27', 'assigned'),
         ('88888888-8888-8888-8888-888888888888',
          '55555555-5555-5555-5555-555555555555',
          $2, '2026-10-29', 'assigned'),
         ('99999999-9999-9999-9999-999999999999',
          '66666666-6666-6666-6666-666666666666',
          $1, '2026-10-25', 'assigned')`,
      [chrisId, garyId],
    );

    getPool.mockReturnValue(pool);

    const chores = await getCalendarChores(chrisId, householdId, {
      startDate: '2026-10-26',
      endDate: '2026-11-01',
      roommateId: undefined,
    });

    expect(chores).toEqual([
      {
        id: '77777777-7777-7777-7777-777777777777',
        choreId: '44444444-4444-4444-4444-444444444444',
        title: 'Wash dishes',
        category: 'Kitchen',
        assigneeId: chrisId,
        assigneeName: 'Chris Zielke',
        dueDate: '2026-10-27',
        status: 'assigned',
      },
      {
        id: '88888888-8888-8888-8888-888888888888',
        choreId: '55555555-5555-5555-5555-555555555555',
        title: 'Buy groceries',
        category: 'Shopping',
        assigneeId: garyId,
        assigneeName: 'Gary Chiu',
        dueDate: '2026-10-29',
        status: 'assigned',
      },
    ]);

const garyChores = await getCalendarChores(chrisId, householdId, {
  startDate: '2026-10-26',
  endDate: '2026-11-01',
  roommateId: garyId,
});

expect(garyChores).toEqual([
  {
    id: '88888888-8888-8888-8888-888888888888',
    choreId: '55555555-5555-5555-5555-555555555555',
    title: 'Buy groceries',
    category: 'Shopping',
    assigneeId: garyId,
    assigneeName: 'Gary Chiu',
    dueDate: '2026-10-29',
    status: 'assigned',
  },
  ]);

    await pool.end();
  });
});