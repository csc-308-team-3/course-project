jest.mock('../server/db', () => ({
  getPool: jest.fn(),
}));

const { newDb, DataType } = require('pg-mem');
const { getPool } = require('../server/db');
const {
  getWeeklyBoard,
} = require('../server/controllers/weeklyBoardController');

function createResponse() {
  const response = {};

  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);

  return response;
}

describe('weekly board with an in-memory PostgreSQL database', () => {
  test('loads a household chore from temporary database tables', async () => {
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
        category text,
        recurrence_frequency text,
        recurrence_start_date date
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
    const userId = '22222222-2222-2222-2222-222222222222';
    const choreId = '33333333-3333-3333-3333-333333333333';
    const instanceId = '44444444-4444-4444-4444-444444444444';

    await pool.query(
      `INSERT INTO users (id, household_id, name) VALUES ($1, $2, $3)`,
      [userId, householdId, 'Chris Zielke'],
    );

    await pool.query(
      `INSERT INTO chores (id, household_id, title, category, recurrence_frequency, recurrence_start_date)
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [choreId, householdId, 'Fix Wi-Fi', 'Technology', 'weekly', '2026-10-12'],
    );

    await pool.query(
      `INSERT INTO chore_instances
       (id, chore_id, assignee_id, due_date, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [instanceId, choreId, userId, '2026-10-16', 'assigned'],
    );

    getPool.mockReturnValue(pool);

    const request = {
      params: { householdId },
      query: { weekStart: '2026-10-12' },
    };
    const response = createResponse();

    await getWeeklyBoard(request, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      householdId,
      weekStart: '2026-10-12',
      weekEnd: '2026-10-18',
      roommates: [
        {
          id: userId,
          name: 'Chris Zielke',
          chores: {
            todo: [
              {
                id: instanceId,
                title: 'Fix Wi-Fi',
                category: 'Technology',
                dueDate: '2026-10-16',
              },
            ],
            due: [],
            complete: [],
          },
        },
      ],
    });

    await pool.end();
  });
});