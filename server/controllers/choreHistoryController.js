const service = require('../services/choreHistoryService');
const {
  getMonthRange,
  getHistoryPagination,
} = require('../utils/choreHistoryValidation');

function handleError(response, error) {
  if (error instanceof service.ChoreHistoryServiceError) {
    return response.status(error.status).json({
      error: error.message,
    });
  }

  console.error('Chore history request failed.', { code: error.code });

  return response.status(500).json({
    error: 'Unable to process chore history.',
  });
}

async function completeChoreInstance(request, response) {
  try {
    const result = await service.completeChoreInstance(
      request.user.id,
      request.params.householdId.toLowerCase(),
      request.params.instanceId.toLowerCase(),
    );

    return response.status(200).json(result);
  } catch (error) {
    return handleError(response, error);
  }
}

async function getChoreHistory(request, response) {
  let pagination;

  try {
    pagination = getHistoryPagination(request.query);
  } catch (error) {
    return response.status(400).json({ error: error.message });
  }

  try {
    const result = await service.getChoreHistory(
      request.user.id,
      request.params.householdId.toLowerCase(),
      request.params.choreId.toLowerCase(),
      pagination,
    );

    return response.status(200).json(result);
  } catch (error) {
    return handleError(response, error);
  }
}

async function getMonthlyStatistics(request, response) {
  let range;

  try {
    range = getMonthRange(request.query.month);
  } catch (error) {
    return response.status(400).json({ error: error.message });
  }

  try {
    const result = await service.getMonthlyStatistics(
      request.user.id,
      request.params.householdId.toLowerCase(),
      range,
    );

    return response.status(200).json(result);
  } catch (error) {
    return handleError(response, error);
  }
}

module.exports = {
  completeChoreInstance,
  getChoreHistory,
  getMonthlyStatistics,
};
