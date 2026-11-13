const { randomUUID } = require('node:crypto');
const { getPool } = require('../db');

class ChoreSwapRequestServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ChoreSwapRequestServiceError';
    this.status = status;
  }
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

async function requireHouseholdMember(db, userId, householdId) {
  const result = await db.query(
    'SELECT household_id FROM users WHERE id = $1',
    [userId],
  );

  if (!result.rows[0]) {
    throw new ChoreSwapRequestServiceError(401, 'Authentication is required.');
  }

  if (result.rows[0].household_id !== householdId) {
    throw new ChoreSwapRequestServiceError(
      403,
      'You are not a member of this household.',
    );
  }
}

async function requireRecipient(db, recipientId, householdId) {
  const result = await db.query(
    'SELECT id FROM users WHERE id = $1 AND household_id = $2',
    [recipientId, householdId],
  );

  if (!result.rows[0]) {
    throw new ChoreSwapRequestServiceError(
      404,
      'Recipient is not a member of this household.',
    );
  }
}

async function getChoreInstance(db, householdId, instanceId, lock = false) {
  const result = await db.query(
    `
      SELECT
        chore_instances.id,
        chore_instances.assignee_id AS "assigneeId",
        chore_instances.status,
        chore_instances.completed_at AS "completedAt"
      FROM chore_instances
      JOIN chores ON chores.id = chore_instances.chore_id
      WHERE chore_instances.id = $1
        AND chores.household_id = $2
      ${lock ? 'FOR UPDATE' : ''}
    `,
    [instanceId, householdId],
  );

  if (!result.rows[0]) {
    throw new ChoreSwapRequestServiceError(404, 'Chore instance not found.');
  }

  return result.rows[0];
}

function isComplete(instance) {
  return (
    instance.completedAt ||
    instance.status === 'complete' ||
    instance.status === 'completed'
  );
}

async function createChoreSwapRequest(
  userId,
  householdId,
  instanceId,
  recipientId,
) {
  if (recipientId === userId) {
    throw new ChoreSwapRequestServiceError(
      400,
      'You cannot send a chore swap request to yourself.',
    );
  }

  try {
    return await withTransaction(async (client) => {
      await requireHouseholdMember(client, userId, householdId);
      await requireRecipient(client, recipientId, householdId);

      const instance = await getChoreInstance(
        client,
        householdId,
        instanceId,
        true,
      );

      if (instance.assigneeId !== userId) {
        throw new ChoreSwapRequestServiceError(
          403,
          'Only the assigned roommate can request a chore swap.',
        );
      }

      if (isComplete(instance)) {
        throw new ChoreSwapRequestServiceError(
          409,
          'Completed chores cannot be swapped.',
        );
      }

      const existing = await client.query(
        `
          SELECT id
          FROM swap_requests
          WHERE chore_instance_id = $1
            AND status = 'pending'
        `,
        [instanceId],
      );

      if (existing.rows[0]) {
        throw new ChoreSwapRequestServiceError(
          409,
          'This chore already has a pending chore swap request.',
        );
      }

      const result = await client.query(
        `
          INSERT INTO swap_requests (
            id,
            chore_instance_id,
            requester_id,
            recipient_id,
            status
          )
          VALUES ($1, $2, $3, $4, 'pending')
          RETURNING
            id,
            chore_instance_id AS "instanceId",
            requester_id AS "requesterId",
            recipient_id AS "recipientId",
            status,
            requested_at AS "requestedAt"
        `,
        [randomUUID(), instanceId, userId, recipientId],
      );

      return result.rows[0];
    });
  } catch (error) {
    if (error.code === '23505') {
      throw new ChoreSwapRequestServiceError(
        409,
        'This chore already has a pending chore swap request.',
      );
    }

    throw error;
  }
}

async function getIncomingChoreSwapRequests(userId, householdId) {
  await requireHouseholdMember(getPool(), userId, householdId);

  const result = await getPool().query(
    `
      SELECT
        swap_requests.id,
        swap_requests.chore_instance_id AS "instanceId",
        swap_requests.requester_id AS "requesterId",
        users.name AS "requesterName",
        chores.title AS "choreTitle",
        TO_CHAR(chore_instances.due_date, 'YYYY-MM-DD') AS "dueDate",
        swap_requests.requested_at AS "requestedAt"
      FROM swap_requests
      JOIN chore_instances ON chore_instances.id = swap_requests.chore_instance_id
      JOIN chores ON chores.id = chore_instances.chore_id
      JOIN users ON users.id = swap_requests.requester_id
      WHERE swap_requests.recipient_id = $1
        AND swap_requests.status = 'pending'
        AND chores.household_id = $2
      ORDER BY swap_requests.requested_at ASC
    `,
    [userId, householdId],
  );

  return result.rows;
}

async function getOutgoingChoreSwapRequests(userId, householdId) {
  await requireHouseholdMember(getPool(), userId, householdId);

  const result = await getPool().query(
    `
      SELECT
        swap_requests.id,
        swap_requests.chore_instance_id AS "instanceId",
        swap_requests.recipient_id AS "recipientId",
        users.name AS "recipientName",
        chores.title AS "choreTitle",
        TO_CHAR(chore_instances.due_date, 'YYYY-MM-DD') AS "dueDate",
        swap_requests.requested_at AS "requestedAt"
      FROM swap_requests
      JOIN chore_instances ON chore_instances.id = swap_requests.chore_instance_id
      JOIN chores ON chores.id = chore_instances.chore_id
      JOIN users ON users.id = swap_requests.recipient_id
      WHERE swap_requests.requester_id = $1
        AND swap_requests.status = 'pending'
        AND chores.household_id = $2
      ORDER BY swap_requests.requested_at ASC
    `,
    [userId, householdId],
  );

  return result.rows;
}

async function getChoreSwapRequest(db, householdId, requestId) {
  const result = await db.query(
    `
      SELECT
        swap_requests.id,
        swap_requests.chore_instance_id AS "instanceId",
        swap_requests.requester_id AS "requesterId",
        swap_requests.recipient_id AS "recipientId",
        swap_requests.status
      FROM swap_requests
      JOIN chore_instances ON chore_instances.id = swap_requests.chore_instance_id
      JOIN chores ON chores.id = chore_instances.chore_id
      WHERE swap_requests.id = $1
        AND chores.household_id = $2
      FOR UPDATE OF swap_requests
    `,
    [requestId, householdId],
  );

  if (!result.rows[0]) {
    throw new ChoreSwapRequestServiceError(
      404,
      'Chore swap request not found.',
    );
  }

  return result.rows[0];
}

async function updateChoreSwapRequestStatus(db, requestId, status) {
  const result = await db.query(
    `
      UPDATE swap_requests
      SET status = $2,
          responded_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        chore_instance_id AS "instanceId",
        requester_id AS "requesterId",
        recipient_id AS "recipientId",
        status,
        requested_at AS "requestedAt",
        responded_at AS "respondedAt"
    `,
    [requestId, status],
  );

  return result.rows[0];
}

async function respondToChoreSwapRequest(
  userId,
  householdId,
  requestId,
  action,
) {
  const result = await withTransaction(async (client) => {
    await requireHouseholdMember(client, userId, householdId);
    const request = await getChoreSwapRequest(client, householdId, requestId);

    if (request.recipientId !== userId) {
      throw new ChoreSwapRequestServiceError(
        403,
        'Only the requested roommate can respond to this chore swap request.',
      );
    }

    if (request.status !== 'pending') {
      throw new ChoreSwapRequestServiceError(
        409,
        'This chore swap request has already been resolved.',
      );
    }

    if (action === 'decline') {
      return {
        request: await updateChoreSwapRequestStatus(
          client,
          requestId,
          'declined',
        ),
      };
    }

    const instance = await getChoreInstance(
      client,
      householdId,
      request.instanceId,
      true,
    );

    if (instance.assigneeId !== request.requesterId || isComplete(instance)) {
      const cancelled = await updateChoreSwapRequestStatus(
        client,
        requestId,
        'cancelled',
      );
      return { request: cancelled, isCancelled: true };
    }

    await client.query(
      'UPDATE chore_instances SET assignee_id = $1 WHERE id = $2',
      [request.recipientId, request.instanceId],
    );

    return {
      request: await updateChoreSwapRequestStatus(
        client,
        requestId,
        'accepted',
      ),
    };
  });

  if (result.isCancelled) {
    throw new ChoreSwapRequestServiceError(
      409,
      'This chore swap request is no longer valid.',
    );
  }

  return result.request;
}

async function cancelChoreSwapRequest(userId, householdId, requestId) {
  return withTransaction(async (client) => {
    await requireHouseholdMember(client, userId, householdId);
    const request = await getChoreSwapRequest(client, householdId, requestId);

    if (request.requesterId !== userId) {
      throw new ChoreSwapRequestServiceError(
        403,
        'Only the requester can cancel this chore swap request.',
      );
    }

    if (request.status !== 'pending') {
      throw new ChoreSwapRequestServiceError(
        409,
        'This chore swap request has already been resolved.',
      );
    }

    return updateChoreSwapRequestStatus(client, requestId, 'cancelled');
  });
}

module.exports = {
  ChoreSwapRequestServiceError,
  cancelChoreSwapRequest,
  createChoreSwapRequest,
  getIncomingChoreSwapRequests,
  getOutgoingChoreSwapRequests,
  respondToChoreSwapRequest,
};
