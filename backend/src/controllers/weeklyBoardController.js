const { buildWeeklyBoard } = require('../services/weeklyBoardService');

function getWeeklyBoard(request, response) {
  const { householdId } = request.params;
  const { weekStart } = request.query;

  if (!householdId) {
    return response.status(400).json({
      error: 'A household ID is required.',
    });
  }

  try {
    // Replace this with PostgreSQL results once the chores table is ready.
    const chores = [];

    const board = buildWeeklyBoard(weekStart, chores);

    return response.status(200).json({
      householdId,
      ...board,
    });
  } catch (error) {
    return response.status(400).json({
      error: error.message,
    });
  }
}

module.exports = {
  getWeeklyBoard,
};