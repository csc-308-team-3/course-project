const choreService = require('../services/choreService');
const {
  CHORE_STATUSES,
  isValidUuid,
  validateCreateChore,
  validateUpdateChore,
} = require('../utils/choreValidation');

// Authentication is provided by the auth backend, which sets request.user to
// { id, householdId }. This middleware only enforces household membership.
function requireHouseholdMember(request, response, next) {
  const { householdId } = request.params;

  if (!request.user || !request.user.id) {
    return response.status(401).json({ error: 'Authentication is required.' });
  }

  if (!isValidUuid(householdId)) {
    return response
      .status(400)
      .json({ error: 'A valid household ID is required.' });
  }

  if (request.user.householdId !== householdId) {
    return response
      .status(403)
      .json({ error: 'You do not have access to this household.' });
  }

  return next();
}

function requireValidChoreId(request, response, next) {
  if (!isValidUuid(request.params.choreId)) {
    return response
      .status(400)
      .json({ error: 'A valid chore ID is required.' });
  }

  return next();
}

function handleError(response, error, action) {
  if (error instanceof choreService.ChoreServiceError) {
    return response.status(error.status).json({ error: error.message });
  }

  console.error(`Chore ${action} failed.`, error);
  return response.status(500).json({ error: `Unable to ${action} the chore.` });
}

async function createChore(request, response) {
  const { errors, value } = validateCreateChore(request.body);

  if (errors.length > 0) {
    return response
      .status(400)
      .json({ error: 'Invalid chore.', details: errors });
  }

  try {
    const chore = await choreService.createChore(
      request.params.householdId,
      request.user.id,
      value,
    );

    return response.status(201).json(chore);
  } catch (error) {
    return handleError(response, error, 'create');
  }
}

async function listChores(request, response) {
  const { assigneeId, status } = request.query;
  const errors = [];

  if (assigneeId !== undefined && !isValidUuid(assigneeId)) {
    errors.push('assigneeId must be a valid user ID.');
  }

  if (status !== undefined && !CHORE_STATUSES.includes(status)) {
    errors.push(`status must be one of: ${CHORE_STATUSES.join(', ')}.`);
  }

  if (errors.length > 0) {
    return response
      .status(400)
      .json({ error: 'Invalid filters.', details: errors });
  }

  try {
    const chores = await choreService.listChores(request.params.householdId, {
      assigneeId,
      status,
    });

    return response.status(200).json({ chores });
  } catch (error) {
    return handleError(response, error, 'list');
  }
}

async function getChore(request, response) {
  try {
    const chore = await choreService.getChore(
      request.params.householdId,
      request.params.choreId,
    );

    return response.status(200).json(chore);
  } catch (error) {
    return handleError(response, error, 'load');
  }
}

async function updateChore(request, response) {
  const { errors, value } = validateUpdateChore(request.body);

  if (errors.length > 0) {
    return response
      .status(400)
      .json({ error: 'Invalid chore.', details: errors });
  }

  try {
    const chore = await choreService.updateChore(
      request.params.householdId,
      request.user.id,
      request.params.choreId,
      value,
    );

    return response.status(200).json(chore);
  } catch (error) {
    return handleError(response, error, 'update');
  }
}

async function deleteChore(request, response) {
  try {
    await choreService.deleteChore(
      request.params.householdId,
      request.params.choreId,
    );

    return response.status(204).send();
  } catch (error) {
    return handleError(response, error, 'delete');
  }
}

module.exports = {
  createChore,
  deleteChore,
  getChore,
  listChores,
  requireHouseholdMember,
  requireValidChoreId,
  updateChore,
};
