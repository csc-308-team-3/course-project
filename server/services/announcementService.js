const { randomUUID } = require('node:crypto');
const { getPool } = require('../db');

// Custom error so the controller knows which HTTP status to return.
class AnnouncementServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'AnnouncementServiceError';
    this.status = status;
  }
}

// Check that the signed-in user belongs to this household.
async function requireHouseholdMember(userId, householdId) {
  const result = await getPool().query(
    'SELECT household_id FROM users WHERE id = $1',
    [userId],
  );

  if (!result.rows[0]) {
    throw new AnnouncementServiceError(
      401,
      'Authentication is required.',
    );
  }

  if (result.rows[0].household_id !== householdId) {
    throw new AnnouncementServiceError(
      403,
      'You are not a member of this household.',
    );
  }
}

// Get the announcement for one household and one selected week.
async function getWeeklyAnnouncement(userId, householdId, weekStart) {
  await requireHouseholdMember(userId, householdId);

  const result = await getPool().query(
    `
      SELECT
        id,
        TO_CHAR(week_start, 'YYYY-MM-DD') AS "weekStart",
        message
      FROM weekly_announcements
      WHERE household_id = $1
        AND week_start = $2::date
    `,
    [householdId, weekStart],
  );

  // Return null when this week has no announcement yet.
  return result.rows[0] ?? null;
}

// Save an announcement for a week.
// If one already exists for this household and week, update it instead.
async function saveWeeklyAnnouncement(userId, householdId, announcement) {
  await requireHouseholdMember(userId, householdId);

  const result = await getPool().query(
    `
      INSERT INTO weekly_announcements (
        id,
        household_id,
        week_start,
        message,
        updated_by_user_id
      )
      VALUES ($1, $2, $3::date, $4, $5)
      ON CONFLICT (household_id, week_start)
      DO UPDATE SET
        message = EXCLUDED.message,
        updated_by_user_id = EXCLUDED.updated_by_user_id,
        updated_at = NOW()
      RETURNING
        id,
        TO_CHAR(week_start, 'YYYY-MM-DD') AS "weekStart",
        message
    `,
    [
      randomUUID(),
      householdId,
      announcement.weekStart,
      announcement.message,
      userId,
    ],
  );

  return result.rows[0];
}

// Remove the announcement for one household and one selected week.
async function deleteWeeklyAnnouncement(userId, householdId, weekStart) {
  await requireHouseholdMember(userId, householdId);

  await getPool().query(
    `
      DELETE FROM weekly_announcements
      WHERE household_id = $1
        AND week_start = $2::date
    `,
    [householdId, weekStart],
  );
}

module.exports = {
  AnnouncementServiceError,
  deleteWeeklyAnnouncement,
  getWeeklyAnnouncement,
  saveWeeklyAnnouncement,
};