const householdService = require('../services/householdService');
const {
  isValidUuid,
  normalizeInviteCode,
  validateCreateHousehold,
} = require('../utils/householdValidation');

function requireAuthenticatedUser(request, response, next) {
  if (!request.user?.id) {
    return response.status(401).json({ error: 'Authentication is required.' });
  }

  return next();
}

function requireValidHouseholdId(request, response, next) {
  if (!isValidUuid(request.params.householdId)) {
    return response
      .status(400)
      .json({ error: 'A valid household ID is required.' });
  }

  return next();
}

function handleError(response, error, action) {
  if (error instanceof householdService.HouseholdServiceError) {
    return response.status(error.status).json({ error: error.message });
  }

  console.error(`Household ${action} failed.`, error);
  return response.status(500).json({ error: `Unable to ${action} household.` });
}

async function createHousehold(request, response) {
  const { errors, value } = validateCreateHousehold(request.body);

  if (errors.length > 0) {
    return response.status(400).json({ error: 'Invalid household.', details: errors });
  }

  try {
    const household = await householdService.createHousehold(
      request.user.id,
      value,
    );
    return response.status(201).json({ household });
  } catch (error) {
    return handleError(response, error, 'create');
  }
}

async function getCurrentHousehold(request, response) {
  try {
    const household = await householdService.getCurrentHousehold(request.user.id);
    return response.status(200).json({ household });
  } catch (error) {
    return handleError(response, error, 'load');
  }
}

async function joinHousehold(request, response) {
  try {
    const household = await householdService.joinHousehold(
      request.user.id,
      normalizeInviteCode(request.body?.inviteCode),
    );
    return response.status(200).json({ household });
  } catch (error) {
    return handleError(response, error, 'join');
  }
}

async function leaveHousehold(request, response) {
  try {
    await householdService.leaveHousehold(
      request.user.id,
      request.params.householdId,
    );
    return response.status(204).send();
  } catch (error) {
    return handleError(response, error, 'leave');
  }
}

async function rotateInviteCode(request, response) {
  try {
    const household = await householdService.rotateInviteCode(
      request.user.id,
      request.params.householdId,
    );
    return response.status(200).json({ household });
  } catch (error) {
    return handleError(response, error, 'rotate invite code for');
  }
}

module.exports = {
  createHousehold,
  getCurrentHousehold,
  joinHousehold,
  leaveHousehold,
  requireAuthenticatedUser,
  requireValidHouseholdId,
  rotateInviteCode,
};
