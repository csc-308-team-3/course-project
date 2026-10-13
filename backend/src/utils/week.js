function isValidIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function getWeeklyRange(weekStart) {
  if (!isValidIsoDate(weekStart)) {
    throw new Error('weekStart must use the YYYY-MM-DD format.');
  }

  const start = new Date(`${weekStart}T00:00:00.000Z`);

  if (start.getUTCDay() !== 1) {
    throw new Error('weekStart must be a Monday.');
  }

  const endExclusive = new Date(start);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 7);

  const end = new Date(endExclusive);
  end.setUTCDate(end.getUTCDate() - 1);

  return {
    weekStart: start.toISOString().slice(0, 10),
    weekEnd: end.toISOString().slice(0, 10),
    endExclusive: endExclusive.toISOString().slice(0, 10),
  };
}

module.exports = {
  getWeeklyRange,
  isValidIsoDate,
};