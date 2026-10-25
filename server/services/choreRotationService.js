const { randomUUID } = require('node:crypto');
const { getPool } = require('../db');

const validRecurrenceFrequencies = new Set([ // only allow these values for recurrence_frequency
  'daily',
  'weekly',
  'monthly',
]);

class ChoreRotationServiceError extends Error {
  constructor(status, message) { // custom error class for chore rotation service errors
    super(message);
    this.name = 'ChoreRotationServiceError';
    this.status = status;
  }
}

function createDate(value) { // converts a valid date string to a JavaScript Date object
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDate(date) { // converts a JavaScript Date object to a valid date string 
  return date.toISOString().slice(0, 10);
}

function isValidDate(value) { // checks whether a value is a valid date string.
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) { // also checks for YYYY-MM-DD format
    return false;
  }

  const date = createDate(value); // converts to JavaScript Date object

  // checks if the date is valid and matches the original string
  return !Number.isNaN(date.getTime()) && formatDate(date) === value;
}

function addDays(date, days) {
  const result = new Date(date); // stores original date
  result.setUTCDate(result.getUTCDate() + days); // adds the specified number of days
  return result; // returns the new date
}

function addMonths(date, months) { 
  const day = date.getUTCDate(); // stores the original day of the month
  const result = new Date( 
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1), // creates new month with day set to 1
  );
  const lastDayOfMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0), // gets the last day of the new month
  ).getUTCDate();

  result.setUTCDate(Math.min(day, lastDayOfMonth)); // sets day to the smaller of original day or last day of month
  return result; // return the new date
}

function validateDateRange(startDate, endDate) {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    throw new ChoreRotationServiceError( // throws error if either start or end date is invalid
      400,
      'startDate and endDate must use the YYYY-MM-DD format.',
    );
  }

  const start = createDate(startDate);
  const end = createDate(endDate);

  if (start > end) {
    throw new ChoreRotationServiceError( // throws error if start date is after end date
      400,
      'startDate must be on or before endDate.',
    );
  }

  return { start, end }; // return valid start and end dates
}

function getOccurrenceDates(frequency, recurrenceStartDate, startDate, endDate) {
  if (!validRecurrenceFrequencies.has(frequency)) {
    throw new ChoreRotationServiceError( // throws error if frequency is not valid
      400,
      'Recurrence frequency must be daily, weekly, or monthly.',
    );
  }

  if (!isValidDate(recurrenceStartDate)) {
    throw new ChoreRotationServiceError( // throws error if recurrence start date is not valid
      400,
      'A recurring chore needs a valid recurrence start date.',
    );
  }

  const recurrenceStart = createDate(recurrenceStartDate);
  const occurrences = []; // array to hold occurrence dates
  let occurrenceNumber = 0; // counter for the number of occurrences
  let dueDate = recurrenceStart; // initializes dueDate to the recurrence start date

  while (dueDate <= endDate) { // loop until dueDate exceeds the end date
    if (dueDate >= startDate) { // only add occurrences that fall within the specified date range
      occurrences.push({ // add occurrence to the array
        dueDate: formatDate(dueDate), 
        occurrenceNumber,
      });
    }

    occurrenceNumber += 1; // increment that the chore has occurred one more time

    if (frequency === 'daily') { 
      // Calculate the next daily due date from the recurrence start date.
      dueDate = addDays(recurrenceStart, occurrenceNumber);
    } else if (frequency === 'weekly') {
      // Calculate the next weekly due date from the recurrence start date.
      dueDate = addDays(recurrenceStart, occurrenceNumber * 7);
    } else {
      // Calculate the next monthly due date from the recurrence start date.
      dueDate = addMonths(recurrenceStart, occurrenceNumber);
    }
  }

  return occurrences; // returns the array of occurrence dates
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

async function requireHouseholdMember(client, userId, householdId) {
  const result = await client.query(
    'SELECT household_id FROM users WHERE id = $1 FOR UPDATE',
    [userId],
  );

  if (!result.rows[0]) {
    throw new ChoreRotationServiceError(401, 'Authentication is required.');
  }

  if (result.rows[0].household_id !== householdId) {
    throw new ChoreRotationServiceError(
      403,
      'You are not a member of this household.',
    );
  }
}

async function getRecurringChores(client, householdId) {
  const result = await client.query(
    `
      SELECT
        id,
        title,
        recurrence_frequency AS frequency,
        TO_CHAR(recurrence_start_date, 'YYYY-MM-DD') AS "recurrenceStartDate"
      FROM chores
      WHERE household_id = $1
        AND recurrence_frequency IN ('daily', 'weekly', 'monthly')
      FOR UPDATE
    `,
    [householdId],
  );

  return result.rows;
}

async function getRotationMembers(client, choreId, householdId) {
  const result = await client.query(
    `
      SELECT chore_rotations.user_id AS "userId"
      FROM chore_rotations
      JOIN users ON users.id = chore_rotations.user_id
      WHERE chore_rotations.chore_id = $1
        AND users.household_id = $2
      ORDER BY chore_rotations.position
    `,
    [choreId, householdId],
  );

  return result.rows;
}

async function getHouseholdMembers(client, householdId) {
  const result = await client.query(
    `
      SELECT id AS "userId"
      FROM users
      WHERE household_id = $1
      ORDER BY name, id
    `,
    [householdId],
  );

  return result.rows;
}

async function getOrCreateRotationMembers(client, choreId, householdId) {
  const existingMembers = await getRotationMembers(
    client,
    choreId,
    householdId,
  );

  if (existingMembers.length > 0) {
    return existingMembers;
  }

  const householdMembers = await getHouseholdMembers(client, householdId);

  for (let position = 0; position < householdMembers.length; position += 1) {
    await client.query(
      `
        INSERT INTO chore_rotations (
          chore_id,
          user_id,
          "position"
        )
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `,
      [choreId, householdMembers[position].userId, position],
    );
  }

  return getRotationMembers(client, choreId, householdId);
}

async function createInstanceIfMissing(client, choreId, assigneeId, dueDate) {
  const result = await client.query(
    `
      INSERT INTO chore_instances (
        id,
        chore_id,
        assignee_id,
        due_date,
        status
      )
      SELECT $1, $2, $3, $4::date, 'assigned'
      WHERE NOT EXISTS (
        SELECT 1
        FROM chore_instances
        WHERE chore_id = $2
          AND due_date = $4::date
      )
      RETURNING
        id,
        chore_id AS "choreId",
        assignee_id AS "assigneeId",
        TO_CHAR(due_date, 'YYYY-MM-DD') AS "dueDate"
    `,
    [randomUUID(), choreId, assigneeId, dueDate],
  );

  return result.rows[0] ?? null;
}

async function generateChoreRotations(userId, householdId, dateRange) {
  const { start, end } = validateDateRange(
    dateRange?.startDate,
    dateRange?.endDate,
  );

  return withTransaction(async (client) => {
    await requireHouseholdMember(client, userId, householdId);

    const chores = await getRecurringChores(client, householdId);
    const generatedAssignments = [];
    const skippedChores = [];

    for (const chore of chores) {
      if (!chore.recurrenceStartDate) {
        skippedChores.push({
          choreId: chore.id,
          reason: 'This chore does not have a recurrence start date.',
        });
        continue;
      }

      const rotationMembers = await getOrCreateRotationMembers(
        client,
        chore.id,
        householdId,
      );

      if (rotationMembers.length === 0) {
        skippedChores.push({
          choreId: chore.id,
          reason: 'This chore does not have a rotation order.',
        });
        continue;
      }

      const occurrences = getOccurrenceDates(
        chore.frequency,
        chore.recurrenceStartDate,
        start,
        end,
      );

      for (const occurrence of occurrences) {
        const rotationIndex =
          occurrence.occurrenceNumber % rotationMembers.length;
        const assignee = rotationMembers[rotationIndex];

        const instance = await createInstanceIfMissing(
          client,
          chore.id,
          assignee.userId,
          occurrence.dueDate,
        );

        if (instance) {
          generatedAssignments.push({
            ...instance,
            title: chore.title,
          });
        }
      }
    }

    return {
      generatedCount: generatedAssignments.length,
      generatedAssignments,
      skippedChores,
    };
  });
}

module.exports = { // exports the functions and error class for use in other files
  ChoreRotationServiceError,
  generateChoreRotations,
  getOccurrenceDates,
  validateDateRange,
};
