const leaderboardService = require('../services/leaderboardService');
const { isValidUuid } = require('../utils/householdValidation');

async function getLeaderboard(request, response) {
  const { householdId } = request.params;

  if (!request.user?.id) {
    return response.status(401).json({ error: 'Authentication is required.' });
  }

  if (!isValidUuid(householdId)) {
    return response.status(400).json({ error: 'A valid household ID is required.' });
  }

  if (request.user.householdId !== householdId) {
    return response.status(403).json({
      error: 'You are not a member of this household.',
    });
  }

  try {
    const leaderboard = await leaderboardService.getHouseholdLeaderboard(
      householdId,
    );

    if (!leaderboard) {
      return response.status(404).json({ error: 'Household not found.' });
    }

    return response.status(200).json(leaderboard);
  } catch (error) {
    console.error('Leaderboard query failed.', error);
    return response.status(500).json({
      error: 'Unable to load the household leaderboard.',
    });
  }
}

module.exports = {
  getLeaderboard,
};
