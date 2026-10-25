const choreRotationService = require('../services/choreRotationService');

function handleError(response, error) {
  if (error instanceof choreRotationService.ChoreRotationServiceError) {
    return response.status(error.status).json({ error: error.message });
  }

  console.error('Chore rotation request failed.', error);
  return response.status(500).json({
    error: 'Unable to generate chore rotations.',
  });
}

async function generateChoreRotations(request, response) {
  try {
    const rotationResult =
      await choreRotationService.generateChoreRotations(
        request.user.id,
        request.params.householdId,
        request.body,
      );

    return response.status(200).json(rotationResult);
  } catch (error) {
    return handleError(response, error);
  }
}

module.exports = {
  generateChoreRotations,
};