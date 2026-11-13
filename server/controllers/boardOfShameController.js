const { getBoardOfShame } = require('../services/boardOfShameService');

async function getBoard(request, response) {
  const { householdId } = request.params;

  if (!request.user) {
    return response.status(401).json({ error: 'Authentication is required.' });
  }
  // Also rejects malformed IDs, since they can never match the user's household.
  if (request.user.householdId !== householdId) {
    return response
      .status(403)
      .json({ error: 'You are not a member of this household.' });
  }

  try {
    const missedChores = await getBoardOfShame(householdId);
    return response.status(200).json({ householdId, missedChores });
  } catch (error) {
    console.error('Board of shame request failed.', error);
    return response
      .status(500)
      .json({ error: 'Unable to load the board of shame.' });
  }
}

module.exports = { getBoard };
