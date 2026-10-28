export function getWeekStart(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== dateString
  ) {
    throw new Error('Enter a valid date.');
  }

  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);

  return date.toISOString().slice(0, 10);
}

export function getToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export async function createChore(householdId, chore) {
  const response = await fetch(
    `/api/households/${householdId}/chores`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chore),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    const details = Array.isArray(data.details)
      ? data.details.join(' ')
      : '';

    throw new Error(
      [data.error || 'Unable to create chore.', details]
        .filter(Boolean)
        .join(' '),
    );
  }

  return data;
}