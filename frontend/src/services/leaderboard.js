const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function getLeaderboard(householdId) {
  return fetch(`${apiBaseUrl}/api/households/${householdId}/leaderboard`, {
    credentials: 'include',
  }).then(async (response) => {
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? 'Unable to load leaderboard.');
    }

    return data;
  });
}
