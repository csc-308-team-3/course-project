const { getPool } = require('../db');

class ChoreHistoryServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ChoreHistoryServiceError';
    this.status = status;
  }
}

async function withHouseholdMember(userId, householdId, work) {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // prevent the requesting user's membership from changing mid request
    const result = await client.query(
      `SELECT household_id
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [userId],
    );

    const user = result.rows[0];

    if (!user) {
      throw new ChoreHistoryServiceError(401, 'Authentication is required.');
    }

    if (user.household_id !== householdId) {
      throw new ChoreHistoryServiceError(
        403,
        'You are not a member of this household.',
      );
    }

    const value = await work(client);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function completeChoreInstance(userId, householdId, instanceId) {
  return withHouseholdMember(userId, householdId, async (client) => {
    const result = await client.query(
      `SELECT
         ci.id,
         ci.assignee_id,
         ci.status,
         ci.completed_at
       FROM chore_instances ci
       JOIN chores c ON c.id = ci.chore_id
       WHERE ci.id = $1
         AND c.household_id = $2
       FOR UPDATE`,
      [instanceId, householdId],
    );

    const instance = result.rows[0];

    // missing instances and instances in other households look identical
    if (!instance) {
      throw new ChoreHistoryServiceError(404, 'Chore instance not found.');
    }

    if (instance.assignee_id !== userId) {
      throw new ChoreHistoryServiceError(
        403,
        'Only the assigned roommate can complete this chore.',
      );
    }

    // do not invent a completion date for older completed records
    if (
      !instance.completed_at &&
      ['complete', 'completed'].includes(instance.status)
    ) {
      throw new ChoreHistoryServiceError(
        409,
        'This completed chore has no recorded completion time.',
      );
    }

    const updated = await client.query(
      `UPDATE chore_instances
       SET status = 'completed',
           completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
       WHERE id = $1
       RETURNING
         id,
         chore_id AS "choreId",
         assignee_id AS "assigneeId",
         status,
         completed_at AS "completedAt"`,
      [instanceId],
    );

    return { instance: updated.rows[0] };
  });
}

async function getChoreHistory(
  userId,
  householdId,
  choreId,
  { limit, offset },
) {
  return withHouseholdMember(userId, householdId, async (client) => {
    const choreResult = await client.query(
      `SELECT id, title
       FROM chores
       WHERE id = $1 AND household_id = $2`,
      [choreId, householdId],
    );

    if (!choreResult.rows[0]) {
      throw new ChoreHistoryServiceError(404, 'Chore not found.');
    }

    const result = await client.query(
      `SELECT
         ci.id AS "instanceId",
         ci.assignee_id AS "memberId",
         u.name AS "memberName",
         ci.completed_at AS "completedAt"
       FROM chore_instances ci
       JOIN chores c ON c.id = ci.chore_id
       JOIN users u ON u.id = ci.assignee_id
       WHERE ci.chore_id = $1
         AND c.household_id = $2
         AND ci.completed_at IS NOT NULL
       ORDER BY ci.completed_at DESC, ci.id DESC
       LIMIT $3 OFFSET $4`,
      [choreId, householdId, limit, offset],
    );

    return {
      householdId,
      chore: choreResult.rows[0],
      limit,
      offset,
      history: result.rows,
    };
  });
}

async function getMonthlyStatistics(userId, householdId, range) {
  return withHouseholdMember(userId, householdId, async (client) => {
    const result = await client.query(
      `SELECT
         u.id AS "memberId",
         u.name AS "memberName",
         COUNT(completions.id)::integer AS "completedCount"
       FROM users u
       LEFT JOIN (
         SELECT ci.id, ci.assignee_id
         FROM chore_instances ci
         JOIN chores c ON c.id = ci.chore_id
         WHERE c.household_id = $1
           AND ci.completed_at >= $2::timestamptz
           AND ci.completed_at < $3::timestamptz
       ) completions ON completions.assignee_id = u.id
       WHERE u.household_id = $1
       GROUP BY u.id, u.name
       ORDER BY u.name, u.id`,
      [householdId, range.start, range.endExclusive],
    );

    return {
      householdId,
      month: range.month,
      timezone: 'UTC',
      members: result.rows,
    };
  });
}

module.exports = {
  ChoreHistoryServiceError,
  completeChoreInstance,
  getChoreHistory,
  getMonthlyStatistics,
};
