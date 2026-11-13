const choreSwapRequestService = require('../services/choreSwapRequestService');
const { isValidUuid } = require('../utils/householdValidation');

function handleError(response, error) {
  if (error instanceof choreSwapRequestService.ChoreSwapRequestServiceError) {
    return response.status(error.status).json({ error: error.message });
  }

  console.error('Chore swap request failed.', error);
  return response
    .status(500)
    .json({ error: 'Unable to process chore swap request.' });
}

function validateId(value, label) {
  if (!isValidUuid(value)) {
    return `${label} must be a valid UUID.`;
  }

  return null;
}

async function createChoreSwapRequest(request, response) {
  const householdError = validateId(request.params.householdId, 'householdId');
  const instanceError = validateId(request.params.instanceId, 'instanceId');
  const recipientError = validateId(request.body?.recipientId, 'recipientId');
  const errors = [householdError, instanceError, recipientError].filter(
    Boolean,
  );

  if (errors.length > 0) {
    return response
      .status(400)
      .json({ error: 'Invalid chore swap request.', details: errors });
  }

  try {
    const choreSwapRequest =
      await choreSwapRequestService.createChoreSwapRequest(
        request.user.id,
        request.params.householdId,
        request.params.instanceId,
        request.body.recipientId,
      );
    return response.status(201).json({ choreSwapRequest });
  } catch (error) {
    return handleError(response, error);
  }
}

async function getIncomingChoreSwapRequests(request, response) {
  const householdError = validateId(request.params.householdId, 'householdId');

  if (householdError) {
    return response.status(400).json({ error: householdError });
  }

  try {
    const choreSwapRequests =
      await choreSwapRequestService.getIncomingChoreSwapRequests(
        request.user.id,
        request.params.householdId,
      );
    return response.status(200).json({ choreSwapRequests });
  } catch (error) {
    return handleError(response, error);
  }
}

async function respondToChoreSwapRequest(request, response) {
  const householdError = validateId(request.params.householdId, 'householdId');
  const requestError = validateId(request.params.requestId, 'requestId');
  const action = request.body?.action;

  if (
    householdError ||
    requestError ||
    !['accept', 'decline'].includes(action)
  ) {
    return response.status(400).json({
      error: 'Invalid chore swap response.',
    });
  }

  try {
    const choreSwapRequest =
      await choreSwapRequestService.respondToChoreSwapRequest(
        request.user.id,
        request.params.householdId,
        request.params.requestId,
        action,
      );
    return response.status(200).json({ choreSwapRequest });
  } catch (error) {
    return handleError(response, error);
  }
}

async function cancelChoreSwapRequest(request, response) {
  const householdError = validateId(request.params.householdId, 'householdId');
  const requestError = validateId(request.params.requestId, 'requestId');

  if (householdError || requestError) {
    return response.status(400).json({
      error: 'Invalid chore swap request.',
    });
  }

  try {
    const choreSwapRequest =
      await choreSwapRequestService.cancelChoreSwapRequest(
        request.user.id,
        request.params.householdId,
        request.params.requestId,
      );
    return response.status(200).json({ choreSwapRequest });
  } catch (error) {
    return handleError(response, error);
  }
}

module.exports = {
  cancelChoreSwapRequest,
  createChoreSwapRequest,
  getIncomingChoreSwapRequests,
  respondToChoreSwapRequest,
};
