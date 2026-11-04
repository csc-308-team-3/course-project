const calendarService = require('../services/calendarService');
const { validateCalendarQuery } = require('../utils/calendarValidation');

function handleError(response, error) {
  if (error instanceof calendarService.CalendarServiceError) {
    return response.status(error.status).json({ error: error.message });
  }

  console.error('Calendar request failed.', error);
  return response.status(500).json({
    error: 'Unable to load calendar chores.',
  });
}

async function getCalendarChores(request, response) {
  const { errors, value } = validateCalendarQuery(request.query);

  if (errors.length > 0) {
    return response.status(400).json({
      error: 'Invalid calendar query.',
      details: errors,
    });
  }

  try {
    const chores = await calendarService.getCalendarChores(
      request.user.id,
      request.params.householdId,
      value,
    );

    return response.status(200).json({
      householdId: request.params.householdId,
      startDate: value.startDate,
      endDate: value.endDate,
      roommateId: value.roommateId,
      chores,
    });
  } catch (error) {
    return handleError(response, error);
  }
}

module.exports = {
  getCalendarChores,
};