const leaderboardService = require('../services/leaderboardService');

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function getLeaderboard(request, response) {
  const { householdId } = request.params;

  if (!isValidUuid(householdId)) {
    return response.status(400).json({ error: 'A valid household ID is required.' });
  }

  try {
    const leaderboard = await leaderboardService.getLeaderboard(
      request.session?.userId,
      householdId,
    );
    return response.status(200).json({ householdId, ...leaderboard });
  } catch (error) {
    if (error instanceof leaderboardService.LeaderboardServiceError) {
      return response.status(error.status).json({ error: error.message });
    }

    console.error('Leaderboard request failed.', error);
    return response.status(500).json({ error: 'Unable to load leaderboard.' });
  }
}

module.exports = { getLeaderboard };
