const { randomBytes, randomUUID } = require('node:crypto');
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

async function fetchHousehold(db, householdId) {
  const result = await db.query(
    `SELECT households.id, households.name, households.invite_code AS "inviteCode",
            users.id AS "memberId"
     FROM households
     LEFT JOIN users ON users.household_id = households.id
     WHERE households.id = $1
     ORDER BY users.id`,
    [householdId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const [first] = result.rows;
  return {
    id: first.id,
    name: first.name,
    inviteCode: first.inviteCode,
    members: result.rows.flatMap((row) => (row.memberId ? [row.memberId] : [])),
  };
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

async function getLockedUser(client, userId) {
  const result = await client.query(
    'SELECT household_id FROM users WHERE id = $1 FOR UPDATE',
    [userId],
  );

  if (!result.rows[0]) {
    throw new HouseholdServiceError(401, 'Authentication is required.');
  }

  return result.rows[0];
}

async function createHousehold(userId, { name }) {
  return withTransaction(async (client) => {
    const user = await getLockedUser(client, userId);

    if (user.household_id) {
      throw new HouseholdServiceError(
        409,
        'You already belong to a household.',
      );
    }

    let household;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const result = await client.query(
          `INSERT INTO households (id, name, invite_code)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [randomUUID(), name, createInviteCode()],
        );
        household = result.rows[0];
        break;
      } catch (error) {
        if (error.code !== '23505' || attempt === 2) {
          throw error;
        }
      }
    }

    await client.query('UPDATE users SET household_id = $1 WHERE id = $2', [
      household.id,
      userId,
    ]);

    return fetchHousehold(client, household.id);
  });
}

async function getCurrentHousehold(userId) {
  const result = await getPool().query(
    'SELECT household_id FROM users WHERE id = $1',
    [userId],
  );

  if (!result.rows[0]) {
    throw new HouseholdServiceError(401, 'Authentication is required.');
  }

  return result.rows[0].household_id
    ? fetchHousehold(getPool(), result.rows[0].household_id)
    : null;
}

async function joinHousehold(userId, inviteCode) {
  return withTransaction(async (client) => {
    const user = await getLockedUser(client, userId);

    if (user.household_id) {
      throw new HouseholdServiceError(
        409,
        'You already belong to a household.',
      );
    }

    const householdResult = await client.query(
      'SELECT id FROM households WHERE invite_code = $1 FOR UPDATE',
      [inviteCode],
    );

    if (!householdResult.rows[0]) {
      throw new HouseholdServiceError(404, 'Wrong invite code.');
    }

    const householdId = householdResult.rows[0].id;
    await client.query('UPDATE users SET household_id = $1 WHERE id = $2', [
      householdId,
      userId,
    ]);

    return fetchHousehold(client, householdId);
  });
}

async function leaveHousehold(userId, householdId) {
  return withTransaction(async (client) => {
    const user = await getLockedUser(client, userId);

    if (user.household_id !== householdId) {
      throw new HouseholdServiceError(
        403,
        'You are not a member of this household.',
      );
    }

    const household = await client.query(
      'SELECT id FROM households WHERE id = $1 FOR UPDATE',
      [householdId],
    );

    if (!household.rows[0]) {
      throw new HouseholdServiceError(404, 'Household not found.');
    }

    await client.query('UPDATE users SET household_id = NULL WHERE id = $1', [
      userId,
    ]);

    const members = await client.query(
      'SELECT id FROM users WHERE household_id = $1 FOR UPDATE',
      [householdId],
    );

    if (members.rows.length === 0) {
      await client.query('DELETE FROM households WHERE id = $1', [householdId]);
    }
  });
}

async function rotateInviteCode(userId, householdId) {
  return withTransaction(async (client) => {
    const user = await getLockedUser(client, userId);

    if (user.household_id !== householdId) {
      throw new HouseholdServiceError(
        403,
        'You are not a member of this household.',
      );
    }

    const existing = await fetchHousehold(client, householdId);
    if (!existing) {
      throw new HouseholdServiceError(404, 'Household not found.');
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await client.query(
          'UPDATE households SET invite_code = $1 WHERE id = $2',
          [createInviteCode(), householdId],
        );
        return fetchHousehold(client, householdId);
      } catch (error) {
        if (error.code !== '23505' || attempt === 2) {
          throw error;
        }
      }
    }
  });
}

module.exports = {
  HouseholdServiceError,
  createHousehold,
  getCurrentHousehold,
  joinHousehold,
  leaveHousehold,
  rotateInviteCode,
};
