const { getPool } = require('../db');

const scoringRule =
  'Each completed chore assigned to a roommate is worth 1 point.';

function withDenseRanks(rows) {
  let previousPoints;
  let currentRank = 0;

  return rows.map((row, index) => {
    const points = Number(row.points) || 0;

    if (previousPoints === undefined || points < previousPoints) {
      currentRank = index + 1;
      previousPoints = points;
    }

    return {
      rank: currentRank,
      roommateId: row.roommateId,
      roommateName: row.roommateName,
      points,
      completedChores: points,
    };
  });
}

async function getHouseholdLeaderboard(householdId) {
  const householdResult = await getPool().query(
    'SELECT id FROM households WHERE id = $1',
    [householdId],
  );

  if (!householdResult.rows[0]) {
    return null;
  }

  const result = await getPool().query(
    `
      SELECT
        users.id AS "roommateId",
        users.name AS "roommateName",
        COALESCE(COUNT(chores.id), 0)::int AS points
      FROM users
      LEFT JOIN chore_instances
        ON chore_instances.assignee_id = users.id
       AND (
         chore_instances.completed_at IS NOT NULL
         OR chore_instances.status IN ('complete', 'completed')
       )
      LEFT JOIN chores
        ON chores.id = chore_instances.chore_id
       AND chores.household_id = users.household_id
      WHERE users.household_id = $1
      GROUP BY users.id, users.name
      ORDER BY points DESC, users.name ASC, users.id ASC
    `,
    [householdId],
  );

  return {
    householdId,
    scoringRule,
    leaderboard: withDenseRanks(result.rows),
  };
}

module.exports = {
  getHouseholdLeaderboard,
  scoringRule,
  withDenseRanks,
};
