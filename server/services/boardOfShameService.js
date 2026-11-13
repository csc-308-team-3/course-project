const { getPool } = require('../db');
const { findOverdueInstances } = require('../utils/overdue');

// Records any newly overdue chores as missed, then returns the household's board.
async function getBoardOfShame(householdId) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT ci.id, ci.assignee_id, ci.status, ci.completed_at, ci.due_time,
       TO_CHAR(ci.due_date, 'YYYY-MM-DD') AS due_date
     FROM chore_instances ci JOIN chores c ON c.id = ci.chore_id
     WHERE c.household_id = $1 AND ci.completed_at IS NULL`,
    [householdId],
  );
  for (const ci of findOverdueInstances(rows)) {
    await pool.query(
      'INSERT INTO missed_chores (chore_instance_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [ci.id, ci.assignee_id],
    );
  }

  const board = await pool.query(
    `SELECT m.chore_instance_id AS "choreInstanceId", c.title, m.user_id AS "userId",
       u.name AS "userName", m.missed_at AS "missedAt", ci.completed_at AS "completedAt"
     FROM missed_chores m
     JOIN chore_instances ci ON ci.id = m.chore_instance_id
     JOIN chores c ON c.id = ci.chore_id
     JOIN users u ON u.id = m.user_id
     WHERE c.household_id = $1
     ORDER BY m.missed_at DESC`,
    [householdId],
  );
  return board.rows;
}

module.exports = { getBoardOfShame };
