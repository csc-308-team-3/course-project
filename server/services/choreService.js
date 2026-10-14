const { randomUUID } = require('node:crypto');
const { getPool } = require('../db');

class ChoreServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ChoreServiceError';
    this.status = status;
  }
}

// Each chore has one chore_instances row holding its assignee, due date/time
// and status; the chores row holds the shared fields.
const CHORE_SELECT = `
  SELECT
    chores.id,
    chores.household_id AS "householdId",
    chores.title,
    chores.instructions,
    chores.category,
    chores.created_by AS "createdBy",
    chore_instances.assignee_id AS "assigneeId",
    TO_CHAR(chore_instances.due_date, 'YYYY-MM-DD') AS "dueDate",
    chore_instances.due_time AS "dueTime",
    chore_instances.status,
    chore_instances.completed_at AS "completedAt"
  FROM chores
  JOIN chore_instances ON chore_instances.chore_id = chores.id
`;

function toChore(row) {
  return {
    id: row.id,
    householdId: row.householdId,
    title: row.title,
    instructions: row.instructions ?? null,
    category: row.category,
    createdBy: row.createdBy ?? null,
    assigneeId: row.assigneeId,
    dueDate: row.dueDate ?? null,
    dueTime: row.dueTime ? row.dueTime.slice(0, 5) : null,
    status: row.status,
    completedAt: row.completedAt ?? null,
  };
}

async function assertHouseholdMember(db, householdId, userId) {
  const result = await db.query(
    'SELECT id FROM users WHERE id = $1 AND household_id = $2',
    [userId, householdId],
  );

  if (result.rows.length === 0) {
    throw new ChoreServiceError(
      400,
      'assigneeId must belong to a member of this household.',
    );
  }
}

async function fetchChore(db, householdId, choreId) {
  const result = await db.query(
    `${CHORE_SELECT} WHERE chores.household_id = $1 AND chores.id = $2`,
    [householdId, choreId],
  );

  return result.rows.length === 0 ? null : toChore(result.rows[0]);
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

async function createChore(householdId, creatorId, fields) {
  const choreId = randomUUID();

  await withTransaction(async (client) => {
    await assertHouseholdMember(client, householdId, fields.assigneeId);

    await client.query(
      `INSERT INTO chores (id, household_id, title, instructions, category, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        choreId,
        householdId,
        fields.title,
        fields.instructions ?? null,
        fields.category,
        creatorId,
      ],
    );

    await client.query(
      `INSERT INTO chore_instances (id, chore_id, assignee_id, due_date, due_time, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        randomUUID(),
        choreId,
        fields.assigneeId,
        fields.dueDate ?? null,
        fields.dueTime ?? null,
        fields.status ?? 'todo',
      ],
    );
  });

  return fetchChore(getPool(), householdId, choreId);
}

async function listChores(householdId, filters = {}) {
  const conditions = ['chores.household_id = $1'];
  const params = [householdId];

  if (filters.assigneeId) {
    params.push(filters.assigneeId);
    conditions.push(`chore_instances.assignee_id = $${params.length}`);
  }

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`chore_instances.status = $${params.length}`);
  }

  const result = await getPool().query(
    `${CHORE_SELECT}
     WHERE ${conditions.join(' AND ')}
     ORDER BY chore_instances.due_date IS NULL, chore_instances.due_date, chores.title`,
    params,
  );

  return result.rows.map(toChore);
}

async function getChore(householdId, choreId) {
  const chore = await fetchChore(getPool(), householdId, choreId);

  if (!chore) {
    throw new ChoreServiceError(404, 'Chore not found.');
  }

  return chore;
}

function buildUpdate(table, columns, fields) {
  const assignments = [];
  const params = [];

  Object.entries(columns).forEach(([field, column]) => {
    if (Object.prototype.hasOwnProperty.call(fields, field)) {
      params.push(fields[field]);
      assignments.push(`${column} = $${params.length}`);
    }
  });

  return { table, assignments, params };
}

async function updateChore(householdId, actorId, choreId, fields) {
  await withTransaction(async (client) => {
    const existing = await fetchChore(client, householdId, choreId);

    if (!existing) {
      throw new ChoreServiceError(404, 'Chore not found.');
    }

    // Only the person the chore is assigned to may change its completion state.
    if (
      Object.prototype.hasOwnProperty.call(fields, 'status') &&
      fields.status !== existing.status &&
      existing.assigneeId !== actorId
    ) {
      throw new ChoreServiceError(
        403,
        'Only the assigned roommate can change a chore status.',
      );
    }

    if (fields.assigneeId) {
      await assertHouseholdMember(client, householdId, fields.assigneeId);
    }

    if (
      Object.prototype.hasOwnProperty.call(fields, 'dueDate') &&
      fields.dueDate === null &&
      !Object.prototype.hasOwnProperty.call(fields, 'dueTime')
    ) {
      // Clearing the date also clears the time, which is meaningless alone.
      fields = { ...fields, dueTime: null };
    }

    const resultingDueDate = Object.prototype.hasOwnProperty.call(
      fields,
      'dueDate',
    )
      ? fields.dueDate
      : existing.dueDate;

    if (fields.dueTime && !resultingDueDate) {
      throw new ChoreServiceError(
        400,
        'dueTime cannot be set without a dueDate.',
      );
    }

    const choreUpdate = buildUpdate(
      'chores',
      {
        title: 'title',
        instructions: 'instructions',
        category: 'category',
      },
      fields,
    );

    if (choreUpdate.assignments.length > 0) {
      choreUpdate.params.push(choreId);
      await client.query(
        `UPDATE chores SET ${choreUpdate.assignments.join(', ')}
         WHERE id = $${choreUpdate.params.length}`,
        choreUpdate.params,
      );
    }

    const instanceUpdate = buildUpdate(
      'chore_instances',
      {
        assigneeId: 'assignee_id',
        dueDate: 'due_date',
        dueTime: 'due_time',
        status: 'status',
      },
      fields,
    );

    if (Object.prototype.hasOwnProperty.call(fields, 'status')) {
      if (fields.status === 'complete' && existing.status !== 'complete') {
        instanceUpdate.assignments.push('completed_at = NOW()');
      } else if (fields.status !== 'complete') {
        instanceUpdate.assignments.push('completed_at = NULL');
      }
    }

    if (instanceUpdate.assignments.length > 0) {
      instanceUpdate.params.push(choreId);
      await client.query(
        `UPDATE chore_instances SET ${instanceUpdate.assignments.join(', ')}
         WHERE chore_id = $${instanceUpdate.params.length}`,
        instanceUpdate.params,
      );
    }
  });

  return fetchChore(getPool(), householdId, choreId);
}

async function deleteChore(householdId, choreId) {
  await withTransaction(async (client) => {
    const existing = await fetchChore(client, householdId, choreId);

    if (!existing) {
      throw new ChoreServiceError(404, 'Chore not found.');
    }

    await client.query('DELETE FROM chore_instances WHERE chore_id = $1', [
      choreId,
    ]);
    await client.query(
      'DELETE FROM chores WHERE id = $1 AND household_id = $2',
      [choreId, householdId],
    );
  });
}

module.exports = {
  ChoreServiceError,
  createChore,
  deleteChore,
  getChore,
  listChores,
  updateChore,
};
