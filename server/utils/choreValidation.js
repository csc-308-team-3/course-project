const { isValidIsoDate } = require('./week');

const CHORE_STATUSES = ['todo', 'due', 'complete'];
const MAX_TITLE_LENGTH = 100;
const MAX_INSTRUCTIONS_LENGTH = 2000;
const MAX_CATEGORY_LENGTH = 50;

function isValidUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function isValidTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

/**
 * Validates chore fields. When `partial` is true (edits), only the fields
 * present in the body are checked; otherwise title and category are required.
 * Returns { errors, value } where value holds the cleaned fields.
 */
function validateChoreFields(body, { partial }) {
  const errors = [];
  const value = {};

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: ['Request body must be a JSON object.'], value };
  }

  if (hasOwn(body, 'title') || !partial) {
    if (typeof body.title !== 'string' || body.title.trim() === '') {
      errors.push('title is required and must be a non-empty string.');
    } else if (body.title.trim().length > MAX_TITLE_LENGTH) {
      errors.push(`title must be at most ${MAX_TITLE_LENGTH} characters.`);
    } else {
      value.title = body.title.trim();
    }
  }

  if (hasOwn(body, 'category') || !partial) {
    if (typeof body.category !== 'string' || body.category.trim() === '') {
      errors.push('category is required and must be a non-empty string.');
    } else if (body.category.trim().length > MAX_CATEGORY_LENGTH) {
      errors.push(
        `category must be at most ${MAX_CATEGORY_LENGTH} characters.`,
      );
    } else {
      value.category = body.category.trim();
    }
  }

  if (hasOwn(body, 'instructions')) {
    if (body.instructions === null) {
      value.instructions = null;
    } else if (typeof body.instructions !== 'string') {
      errors.push('instructions must be a string or null.');
    } else if (body.instructions.length > MAX_INSTRUCTIONS_LENGTH) {
      errors.push(
        `instructions must be at most ${MAX_INSTRUCTIONS_LENGTH} characters.`,
      );
    } else {
      value.instructions = body.instructions.trim() || null;
    }
  }

  if (hasOwn(body, 'dueDate')) {
    if (body.dueDate === null) {
      value.dueDate = null;
    } else if (!isValidIsoDate(body.dueDate)) {
      errors.push('dueDate must be a real calendar date in YYYY-MM-DD format.');
    } else {
      value.dueDate = body.dueDate;
    }
  }

  if (hasOwn(body, 'dueTime')) {
    if (body.dueTime === null) {
      value.dueTime = null;
    } else if (!isValidTime(body.dueTime)) {
      errors.push('dueTime must use the 24-hour HH:MM format.');
    } else {
      value.dueTime = body.dueTime;
    }
  }

  if (hasOwn(body, 'assigneeId')) {
    if (!isValidUuid(body.assigneeId)) {
      errors.push('assigneeId must be a valid user ID.');
    } else {
      value.assigneeId = body.assigneeId;
    }
  } else if (!partial) {
    errors.push('assigneeId is required.');
  }

  if (hasOwn(body, 'status')) {
    if (!CHORE_STATUSES.includes(body.status)) {
      errors.push(`status must be one of: ${CHORE_STATUSES.join(', ')}.`);
    } else {
      value.status = body.status;
    }
  }

  if (partial && errors.length === 0 && Object.keys(value).length === 0) {
    errors.push('Provide at least one field to update.');
  }

  return { errors, value };
}

function validateCreateChore(body) {
  const result = validateChoreFields(body, { partial: false });

  if (
    result.errors.length === 0 &&
    result.value.dueTime &&
    !result.value.dueDate
  ) {
    result.errors.push('dueTime cannot be set without a dueDate.');
  }

  return result;
}

function validateUpdateChore(body) {
  return validateChoreFields(body, { partial: true });
}

module.exports = {
  CHORE_STATUSES,
  isValidUuid,
  validateCreateChore,
  validateUpdateChore,
};
