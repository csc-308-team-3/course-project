// Keep announcements short enough for the chore-board layout.
const MAX_ANNOUNCEMENT_LENGTH = 60;

// Check that a value is a real date written as YYYY-MM-DD.
function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  // This also rejects impossible dates such as 2026-02-30.
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

// A board week always starts on Monday.
function validateWeekStart(weekStart) {
  if (!isValidDate(weekStart)) {
    return 'weekStart must use the YYYY-MM-DD format.';
  }

  const date = new Date(`${weekStart}T00:00:00.000Z`);

  if (date.getUTCDay() !== 1) {
    return 'weekStart must be a Monday.';
  }

  return null;
}

// Check the week and announcement message before saving to the database.
function validateAnnouncement(body) {
  const errors = [];
  const weekStart = body?.weekStart;
  const message =
    typeof body?.message === 'string' ? body.message.trim() : '';

  const weekStartError = validateWeekStart(weekStart);

  if (weekStartError) {
    errors.push(weekStartError);
  }

  if (!message) {
    errors.push('Announcement message is required.');
  } else if (message.length > MAX_ANNOUNCEMENT_LENGTH) {
    errors.push(`Announcement message must be ${MAX_ANNOUNCEMENT_LENGTH} characters or fewer.`);
  }

  return {
    errors,
    value: {
      weekStart,
      message,
    },
  };
}

module.exports = {
  validateAnnouncement,
  validateWeekStart,
};