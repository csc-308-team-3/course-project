const { getPool } = require('../db');
const { buildWeeklyBoard } = require('../services/weeklyBoardService');
const { getWeeklyRange } = require('../utils/week');

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function getWeeklyBoard(request, response) {
  const { householdId } = request.params;
  const { weekStart } = request.query;

  if (!isValidUuid(householdId)) {
    return response.status(400).json({
      error: 'A valid household ID is required.',
    });
  }

  try {
    const { endExclusive } = getWeeklyRange(weekStart);

    const result = await getPool().query(
      `
        SELECT
          chore_instances.id,
          chore_instances.assignee_id AS "roommateId",
          users.name AS "roommateName",
          chores.title,
          COALESCE(chores.recurrence_frequency, 'One-time') AS category,
          TO_CHAR(chore_instances.due_date, 'YYYY-MM-DD') AS "dueDate",
          CASE
            WHEN chore_instances.completed_at IS NOT NULL
              OR chore_instances.status IN ('complete', 'completed')
              THEN 'complete'
            WHEN chore_instances.due_date = CURRENT_DATE
              THEN 'due'
            ELSE 'todo'
          END AS status
        FROM chore_instances
        JOIN chores ON chores.id = chore_instances.chore_id
        JOIN users ON users.id = chore_instances.assignee_id
        WHERE chores.household_id = $1
        AND users.household_id = $1
        AND (((
              chore_instances.completed_at IS NOT NULL
              OR chore_instances.status IN ('complete', 'completed'))
            AND COALESCE(chore_instances.completed_at::date, chore_instances.due_date) >= $2::date
            AND COALESCE(chore_instances.completed_at::date, chore_instances.due_date) < $3::date
          ) OR (
            chore_instances.completed_at IS NULL
            AND chore_instances.status NOT IN ('complete', 'completed')
            AND chore_instances.due_date >= $2::date
            AND chore_instances.due_date < $3::date
          ))
        ORDER BY users.name, chore_instances.due_date, chores.title
      `,
      [householdId, weekStart, endExclusive],
    );

    const board = buildWeeklyBoard(weekStart, result.rows);

    return response.status(200).json({
      householdId,
      ...board,
    });
  } catch (error) {
    if (error.message.startsWith('weekStart')) {
      return response.status(400).json({ error: error.message });
    }

    console.error('Weekly board query failed.', error);
    return response.status(500).json({
      error: 'Unable to load the weekly chore board.',
    });
  }
}

module.exports = {
  getWeeklyBoard,
};