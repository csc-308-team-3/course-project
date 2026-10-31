const { randomUUID } = require('node:crypto');
const { getPool } = require('../db');

class ChoreServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ChoreServiceError';
    this.status = status;
  }
}

async function createChore(userId, householdId, input) {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // lock both users so their memberships cannot change during creation
    const users = await client.query(
      `SELECT id, household_id
       FROM users
       WHERE id IN ($1, $2)
       ORDER BY id
       FOR UPDATE`,
      [userId, input.assigneeId],
    );

    const creator = users.rows.find((user) => user.id === userId);

    if (!creator) {
      throw new ChoreServiceError(401, 'Authentication is required.');
    }

    if (creator.household_id !== householdId) {
      throw new ChoreServiceError(
        403,
        'You are not a member of this household.',
      );
    }

    const assignee = users.rows.find((user) => user.id === input.assigneeId);

    if (!assignee || assignee.household_id !== householdId) {
      throw new ChoreServiceError(
        400,
        'The assigned roommate must belong to this household.',
      );
    }

    const choreId = randomUUID();

    await client.query(
      `INSERT INTO chores (
     id, household_id, title, category, instructions,
     estimated_duration, recurrence_frequency, recurrence_start_date
   )
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        choreId,
        householdId,
        input.title,
        input.category,
        input.instructions,
        input.estimatedDuration,
        input.recurrenceFrequency,
        input.recurrenceStartDate,
      ],
    );

    const instance = {
      id: randomUUID(),
      choreId,
      assigneeId: input.assigneeId,
      dueDate: input.dueDate,
      dueTime: input.dueTime,
      status: 'assigned',
    };

    await client.query(
      `INSERT INTO chore_instances (
         id, chore_id, assignee_id, due_date, due_time, status
       )
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        instance.id,
        choreId,
        instance.assigneeId,
        instance.dueDate,
        instance.dueTime,
        instance.status,
      ],
    );

    if (input.recurrenceFrequency !== 'one-time') {
      const members = await client.query(
        `SELECT id
         FROM users
         WHERE household_id = $1
         ORDER BY name, id`,
        [householdId],
      );

      // start with the chosen assignee, followed by the other roommates
      const rotationOrder = [
        input.assigneeId,
        ...members.rows
          .map((member) => member.id)
          .filter((id) => id !== input.assigneeId),
      ];

      for (let position = 0; position < rotationOrder.length; position += 1) {
        await client.query(
          `INSERT INTO chore_rotations (chore_id, user_id, "position")
           VALUES ($1, $2, $3)`,
          [choreId, rotationOrder[position], position + 1],
        );
      }
    }

    await client.query('COMMIT');

    return {
      chore: {
        id: choreId,
        householdId,
        title: input.title,
        category: input.category,
        instructions: input.instructions,
        estimatedDuration: input.estimatedDuration,
        recurrenceFrequency: input.recurrenceFrequency,
        recurrenceStartDate: input.recurrenceStartDate,
      },
      instance,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { ChoreServiceError, createChore };
