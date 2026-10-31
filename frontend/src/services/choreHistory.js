export function isValidMonth(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return false;

  const year = Number(month.slice(0, 4));
  return year >= 1 && year <= 9998;
}

export function getCurrentUtcMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function statisticsPath(householdId, month) {
  const query = new URLSearchParams({ month });

  return `/api/households/${householdId}/chore-statistics?${query}`;
}

export function historyPath(householdId, choreId, offset) {
  const query = new URLSearchParams({
    limit: '50',
    offset: String(offset),
  });

  return `/api/households/${householdId}/chores/${choreId}/history?${query}`;
}

export async function readChoreHistoryApi(path, signal) {
  const response = await fetch(path, {
    credentials: 'include',
    signal,
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Your session has expired. Please log in again.');
    }

    if (response.status === 403) {
      throw new Error('You do not have access to this household.');
    }

    throw new Error(data.error || 'Unable to load chore information.');
  }

  return data;
}
