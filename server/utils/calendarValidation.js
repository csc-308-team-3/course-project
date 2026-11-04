const { isValidUuid } = require('./householdValidation');

function createDate(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = createDate(value);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function validateCalendarQuery(query) {
  const { startDate, endDate, roommateId } = query;
  const errors = [];

  if (!isValidDate(startDate)) {
    errors.push('startDate must use the YYYY-MM-DD format.');
  }

  if (!isValidDate(endDate)) {
    errors.push('endDate must use the YYYY-MM-DD format.');
  }

  if (
    isValidDate(startDate) &&
    isValidDate(endDate) &&
    createDate(startDate) > createDate(endDate)
  ) {
    errors.push('startDate must be on or before endDate.');
  }

  if (roommateId !== undefined && !isValidUuid(roommateId)) {
    errors.push('roommateId must be a valid UUID when provided.');
  }

  return {
    errors,
    value: {
      startDate,
      endDate,
      roommateId,
    },
  };
}

module.exports = {
  validateCalendarQuery,
};