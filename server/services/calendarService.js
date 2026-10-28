const { getPool } = require('../db');

class CalendarServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'CalendarServiceError';
    this.status = status;
  }
}

async function requireHouseholdMember(userId, householdId) {
  const result = await getPool().query(
    'SELECT household_id FROM users WHERE id = $1',
    [userId],
  );

  if (!result.rows[0]) {
    throw new CalendarServiceError(401, 'Authentication is required.');
  }

  if (result.rows[0].household_id !== householdId) {
    throw new CalendarServiceError(
      403,
      'You are not a member of this household.',
    );
  }
}

async function requireHouseholdRoommate(roommateId, householdId) {
  const result = await getPool().query(
    'SELECT id FROM users WHERE id = $1 AND household_id = $2',
    [roommateId, householdId],
  );

  if (!result.rows[0]) {
    throw new CalendarServiceError(
      404,
      'Roommate not found in this household.',
    );
  }
}

async function getCalendarChores(userId, householdId, filters) {
  const { startDate, endDate, roommateId } = filters;

  await requireHouseholdMember(userId, householdId);

  if (roommateId) {
    await requireHouseholdRoommate(roommateId, householdId);
  }

  const values = [householdId, startDate, endDate];
  let roommateFilter = '';

  if (roommateId) {
    values.push(roommateId);
    roommateFilter = 'AND chore_instances.assignee_id = $4';
  }

  const result = await getPool().query(
    `
      SELECT
        chore_instances.id,
        chore_instances.chore_id AS "choreId",
        chores.title,
        COALESCE(chores.category, 'Uncategorized') AS category,
        chore_instances.assignee_id AS "assigneeId",
        users.name AS "assigneeName",
        TO_CHAR(chore_instances.due_date, 'YYYY-MM-DD') AS "dueDate",
        CASE
          WHEN chore_instances.completed_at IS NOT NULL
            OR chore_instances.status IN ('complete', 'completed')
            THEN 'complete'
          ELSE chore_instances.status
        END AS status
      FROM chore_instances
      JOIN chores ON chores.id = chore_instances.chore_id
      JOIN users ON users.id = chore_instances.assignee_id
      WHERE chores.household_id = $1
        AND users.household_id = $1
        AND chore_instances.due_date >= $2::date
        AND chore_instances.due_date <= $3::date
        ${roommateFilter}
      ORDER BY chore_instances.due_date, users.name, chores.title
    `,
    values,
  );

  return result.rows;
}

module.exports = {
  CalendarServiceError,
  getCalendarChores,
};