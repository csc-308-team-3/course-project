const announcementService = require('../services/announcementService');
const {
  validateAnnouncement,
  validateWeekStart,
} = require('../utils/announcementValidation');

// Send expected service errors back with the correct HTTP status.
function handleError(response, error) {
  if (error instanceof announcementService.AnnouncementServiceError) {
    return response.status(error.status).json({ error: error.message });
  }

  console.error('Announcement request failed.', error);

  return response.status(500).json({
    error: 'Unable to update announcement.',
  });
}

// Load the announcement for the selected household and week.
async function getWeeklyAnnouncement(request, response) {
  const weekStartError = validateWeekStart(request.query.weekStart);

  if (weekStartError) {
    return response.status(400).json({ error: weekStartError });
  }

  try {
    const announcement = await announcementService.getWeeklyAnnouncement(
      request.user.id,
      request.params.householdId,
      request.query.weekStart,
    );

    return response.status(200).json({ announcement });
  } catch (error) {
    return handleError(response, error);
  }
}

// Create or update the announcement for the selected household and week.
async function saveWeeklyAnnouncement(request, response) {
  const { errors, value } = validateAnnouncement(request.body);

  if (errors.length > 0) {
    return response.status(400).json({
      error: 'Invalid announcement.',
      details: errors,
    });
  }

  try {
    const announcement = await announcementService.saveWeeklyAnnouncement(
      request.user.id,
      request.params.householdId,
      value,
    );

    return response.status(200).json({ announcement });
  } catch (error) {
    return handleError(response, error);
  }
}

module.exports = {
  getWeeklyAnnouncement,
  saveWeeklyAnnouncement,
};