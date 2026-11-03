jest.mock('../server/db', () => ({
  getPool: jest.fn(),
}));

const { newDb, DataType } = require('pg-mem');
const { getPool } = require('../server/db');
const {
  getWeeklyAnnouncement,
  saveWeeklyAnnouncement,
} = require('../server/services/announcementService');

describe('weekly announcements with an in-memory PostgreSQL database', () => {
  test('creates, updates, and loads one announcement for a household week', async () => {
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
      CREATE TABLE households (
        id uuid PRIMARY KEY
      )
    `);

    await pool.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY,
        household_id uuid
      )
    `);

    await pool.query(`
      CREATE TABLE weekly_announcements (
        id uuid PRIMARY KEY,
        household_id uuid NOT NULL,
        week_start date NOT NULL,
        message text NOT NULL,
        updated_by_user_id uuid NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT NOW(),
        updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
        UNIQUE (household_id, week_start)
      )
    `);

    const householdId = '11111111-1111-1111-1111-111111111111';
    const userId = '22222222-2222-2222-2222-222222222222';

    await pool.query('INSERT INTO households (id) VALUES ($1)', [
      householdId,
    ]);

    await pool.query(
      'INSERT INTO users (id, household_id) VALUES ($1, $2)',
      [userId, householdId],
    );

    getPool.mockReturnValue(pool);

    const firstAnnouncement = await saveWeeklyAnnouncement(
      userId,
      householdId,
      {
        weekStart: '2026-11-02',
        message: 'Remember to take out the trash!',
      },
    );

    expect(firstAnnouncement).toEqual({
      id: expect.any(String),
      weekStart: '2026-11-02',
      message: 'Remember to take out the trash!',
    });

    const updatedAnnouncement = await saveWeeklyAnnouncement(
      userId,
      householdId,
      {
        weekStart: '2026-11-02',
        message: 'Trash day is Thursday this week!',
      },
    );

    expect(updatedAnnouncement).toEqual({
      id: firstAnnouncement.id,
      weekStart: '2026-11-02',
      message: 'Trash day is Thursday this week!',
    });

    const savedAnnouncement = await getWeeklyAnnouncement(
      userId,
      householdId,
      '2026-11-02',
    );

    expect(savedAnnouncement).toEqual(updatedAnnouncement);

    const noAnnouncement = await getWeeklyAnnouncement(
      userId,
      householdId,
      '2026-11-09',
    );

    expect(noAnnouncement).toBeNull();

    const count = await pool.query(
      'SELECT COUNT(*) AS total FROM weekly_announcements',
    );

    expect(count.rows[0].total).toBe(1);

    await pool.end();
  });
});