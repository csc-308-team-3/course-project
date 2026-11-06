const { isValidUuid } = require('./householdValidation');
const { isValidIsoDate } = require('./week');

function validateCreateChore(body) {
  const errors = [];
  const value = {};

  for (const field of ['title', 'category', 'instructions']) {
    value[field] = typeof body?.[field] === 'string' ? body[field].trim() : '';

    if (!value[field]) {
      errors.push(`${field} must be a non-empty string.`);
    }
  }

  value.assigneeId = body?.assigneeId;

  if (!isValidUuid(value.assigneeId)) {
    errors.push('assigneeId must be a valid UUID.');
  } else {
    value.assigneeId = value.assigneeId.toLowerCase();
  }

  value.dueDate = body?.dueDate;

  if (!isValidIsoDate(value.dueDate)) {
    errors.push('dueDate must be a valid date in YYYY-MM-DD format.');
  }

  value.recurrenceFrequency = body?.recurrenceFrequency ?? 'one-time';

  value.estimatedDuration = body?.estimatedDuration;

  if (
    !Number.isInteger(value.estimatedDuration) ||
    value.estimatedDuration < 1 ||
    value.estimatedDuration > 2147483647
  ) {
    errors.push('estimatedDuration must be a positive integer in minutes.');
  }

  value.dueTime = body?.dueTime;

  if (
    typeof value.dueTime !== 'string' ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.dueTime)
  ) {
    errors.push('dueTime must use the HH:mm format, such as 18:30.');
  }

  value.recurrenceStartDate = body?.recurrenceStartDate ?? null;

  const frequencies = ['one-time', 'daily', 'weekly', 'monthly'];

  if (!frequencies.includes(value.recurrenceFrequency)) {
    errors.push(
      'recurrenceFrequency must be one-time, daily, weekly, or monthly.',
    );
  } else if (value.recurrenceFrequency === 'one-time') {
    if (value.recurrenceStartDate !== null) {
      errors.push('One-time chores must not have a recurrenceStartDate.');
    }
  } else if (!isValidIsoDate(value.recurrenceStartDate)) {
    errors.push('Recurring chores require a valid recurrenceStartDate.');
  } else if (value.dueDate !== value.recurrenceStartDate) {
    errors.push(
      'For recurring chores, dueDate must equal recurrenceStartDate.',
    );
  }

  return { errors, value };
}

module.exports = { validateCreateChore };
