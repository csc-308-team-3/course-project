const { getPool } = require('../db');

class LeaderboardServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'LeaderboardServiceError';
    this.status = status;
  }
}

async function getLeaderboard(userId, householdId) {
  if (!userId) {
    throw new LeaderboardServiceError(401, 'Authentication is required.');
  }

  const pool = getPool();
  const membership = await pool.query(
    'SELECT household_id FROM users WHERE id = $1',
    [userId],
  );

  if (!membership.rows[0] || membership.rows[0].household_id !== householdId) {
    throw new LeaderboardServiceError(
      403,
      'You are not a member of this household.',
    );
  }

  const [householdResult, membersResult] = await Promise.all([
    pool.query('SELECT name FROM households WHERE id = $1', [householdId]),
    pool.query(
      `SELECT
         id,
         name,
         score,
         RANK() OVER (ORDER BY score DESC) AS rank
       FROM users
       WHERE household_id = $1
       ORDER BY score DESC, name ASC`,
      [householdId],
    ),
  ]);

  if (!householdResult.rows[0]) {
    throw new LeaderboardServiceError(404, 'Household not found.');
  }

  return {
    householdName: householdResult.rows[0].name,
    members: membersResult.rows.map((member) => ({
      id: member.id,
      name: member.name,
      points: member.score,
      rank: Number(member.rank),
    })),
  };
}

module.exports = { LeaderboardServiceError, getLeaderboard };
