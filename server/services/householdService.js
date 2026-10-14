const { randomBytes } = require('node:crypto');
const { getPool } = require('../db');

class HouseholdServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HouseholdServiceError';
    this.status = status;
  }
}

function createInviteCode() {
  return randomBytes(5).toString('hex').toUpperCase();
}

async function withTransaction(work) {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function fetchHousehold(db, householdId) {
  const householdResult = await db.query(
    `SELECT id, name, invite_code AS "inviteCode"
     FROM households
     WHERE id = $1`,
    [householdId],
  );

  if (householdResult.rows.length === 0) {
    return null;
  }

  const membersResult = await db.query(
    'SELECT id FROM users WHERE household_id = $1 ORDER BY id',
    [householdId],
  );

  return {
    ...householdResult.rows[0],
    members: membersResult.rows.map((member) => member.id),
  };
}

async function getLockedUser(db, userId) {
  const result = await db.query(
    'SELECT id, household_id AS "householdId" FROM users WHERE id = $1 FOR UPDATE',
    [userId],
  );

  if (result.rows.length === 0) {
    throw new HouseholdServiceError(404, 'User not found.');
  }

  return result.rows[0];
}

async function requireHouseholdMember(db, userId, householdId) {
  const user = await getLockedUser(db, userId);

  if (user.householdId !== householdId) {
    throw new HouseholdServiceError(
      403,
      'You do not have access to this household.',
    );
  }
}

async function createHousehold(userId, fields) {
  const householdId = await withTransaction(async (client) => {
    const user = await getLockedUser(client, userId);

    if (user.householdId) {
      throw new HouseholdServiceError(
        409,
        'You already belong to a household.',
      );
    }

    const result = await client.query(
      `INSERT INTO households (name, invite_code)
       VALUES ($1, $2)
       RETURNING id`,
      [fields.name, createInviteCode()],
    );

    await client.query('UPDATE users SET household_id = $1 WHERE id = $2', [
      result.rows[0].id,
      userId,
    ]);

    return result.rows[0].id;
  });

  return fetchHousehold(getPool(), householdId);
}

async function getCurrentHousehold(userId) {
  const result = await getPool().query(
    'SELECT household_id AS "householdId" FROM users WHERE id = $1',
    [userId],
  );

  if (result.rows.length === 0) {
    throw new HouseholdServiceError(404, 'User not found.');
  }

  if (!result.rows[0].householdId) {
    return null;
  }

  return fetchHousehold(getPool(), result.rows[0].householdId);
}

async function joinHousehold(userId, inviteCode) {
  const householdId = await withTransaction(async (client) => {
    const user = await getLockedUser(client, userId);

    if (user.householdId) {
      throw new HouseholdServiceError(
        409,
        'You already belong to a household.',
      );
    }

    const householdResult = await client.query(
      'SELECT id FROM households WHERE invite_code = $1 FOR UPDATE',
      [inviteCode],
    );

    if (householdResult.rows.length === 0) {
      throw new HouseholdServiceError(404, 'Wrong invite code.');
    }

    const { id: householdId } = householdResult.rows[0];
    await client.query('UPDATE users SET household_id = $1 WHERE id = $2', [
      householdId,
      userId,
    ]);

    return householdId;
  });

  return fetchHousehold(getPool(), householdId);
}

async function leaveHousehold(userId, householdId) {
  await withTransaction(async (client) => {
    await requireHouseholdMember(client, userId, householdId);

    await client.query('UPDATE users SET household_id = NULL WHERE id = $1', [
      userId,
    ]);

    const remainingMembers = await client.query(
      'SELECT COUNT(*)::int AS count FROM users WHERE household_id = $1',
      [householdId],
    );

    if (remainingMembers.rows[0].count === 0) {
      await client.query('DELETE FROM households WHERE id = $1', [householdId]);
    }
  });
}

async function rotateInviteCode(userId, householdId) {
  await withTransaction(async (client) => {
    await requireHouseholdMember(client, userId, householdId);
    await client.query('UPDATE households SET invite_code = $1 WHERE id = $2', [
      createInviteCode(),
      householdId,
    ]);
  });

  return fetchHousehold(getPool(), householdId);
}

module.exports = {
  HouseholdServiceError,
  createHousehold,
  getCurrentHousehold,
  joinHousehold,
  leaveHousehold,
  rotateInviteCode,
};
