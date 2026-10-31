function getMonthRange(month) {
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error('month must use YYYY-MM format.');
  }

  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));

  // keep dates within the four digit years supported by this API
  if (year < 1 || year > 9998) {
    throw new Error('month year must be between 0001 and 9998.');
  }

  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;

  return {
    month,
    start: `${month}-01T00:00:00.000Z`,
    endExclusive:
      `${String(nextYear).padStart(4, '0')}-` +
      `${String(nextMonth).padStart(2, '0')}-01T00:00:00.000Z`,
  };
}

function getHistoryPagination(query) {
  const limitText = query.limit ?? '50';
  const offsetText = query.offset ?? '0';

  if (
    typeof limitText !== 'string' ||
    !/^\d+$/.test(limitText) ||
    typeof offsetText !== 'string' ||
    !/^\d+$/.test(offsetText)
  ) {
    throw new Error('limit and offset must be whole numbers.');
  }

  const limit = Number(limitText);
  const offset = Number(offsetText);

  if (limit < 1 || limit > 100) {
    throw new Error('limit must be between 1 and 100.');
  }

  if (!Number.isSafeInteger(offset) || offset > 2147483647) {
    throw new Error('offset must be between 0 and 2147483647.');
  }

  return { limit, offset };
}

module.exports = { getMonthRange, getHistoryPagination };
