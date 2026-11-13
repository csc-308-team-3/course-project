const { getPool } = require('../db');

async function getProfileByUserId(userId) {
  const result = await getPool().query(
    `
      SELECT
        users.id,
        users.name,
        users.email,
        users.household_id AS "householdId",
        households.name AS "householdName",
        users.household_joined_at AS "householdJoinedAt",
        COUNT(chore_instances.id)::integer AS "completedChoreCount"
      FROM users
      LEFT JOIN households ON households.id = users.household_id
      LEFT JOIN chores ON chores.household_id = users.household_id
      LEFT JOIN chore_instances
        ON chore_instances.chore_id = chores.id
        AND chore_instances.assignee_id = users.id
        AND (
          chore_instances.completed_at IS NOT NULL
          OR chore_instances.status IN ('complete', 'completed')
        )
      WHERE users.id = $1
      GROUP BY
        users.id,
        users.name,
        users.email,
        users.household_id,
        households.name,
        users.household_joined_at
    `,
    [userId],
  );

  const user = result.rows[0];

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    household: user.householdId
      ? {
          id: user.householdId,
          name: user.householdName,
          joinedAt: user.householdJoinedAt,
        }
      : null,
    completedChoreCount: user.completedChoreCount,
  };
}

async function updateProfile(userId, { name, email }) {
  const updates = [];
  const values = [];

  if (name !== undefined) {
    values.push(name);
    updates.push(`name = $${values.length}`);
  }

  if (email !== undefined) {
    values.push(email);
    updates.push(`email = $${values.length}`);
  }

  if (updates.length === 0) {
    throw new Error('No profile fields were provided.');
  }

  values.push(userId);

  const result = await getPool().query(
    `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${values.length}
      RETURNING id
    `,
    values,
  );

  if (!result.rows[0]) {
    return null;
  }

  return getProfileByUserId(userId);
}

module.exports = {
  getProfileByUserId,
  updateProfile,
}; 