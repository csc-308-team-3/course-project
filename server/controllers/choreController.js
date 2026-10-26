const choreService = require('../services/choreService');
const { validateCreateChore } = require('../utils/choreValidation');

async function createChore(request, response) {
  const { errors, value } = validateCreateChore(request.body);

  if (errors.length > 0) {
    return response.status(400).json({
      error: 'Invalid chore.',
      details: errors,
    });
  }

  try {
    const result = await choreService.createChore(
      request.user.id,
      request.params.householdId.toLowerCase(),
      value,
    );

    return response.status(201).json(result);
  } catch (error) {
    if (error instanceof choreService.ChoreServiceError) {
      return response.status(error.status).json({
        error: error.message,
      });
    }

    console.error('Chore creation failed.', { code: error.code });

    return response.status(500).json({
      error: 'Unable to create chore.',
    });
  }
}

module.exports = { createChore };