const express = require('express');
const {
  deleteWeeklyAnnouncement,
  getWeeklyAnnouncement,
  saveWeeklyAnnouncement,
} = require('../controllers/announcementController');
const {
  requireAuthenticatedUser,
  requireValidHouseholdId,
} = require('../controllers/householdController');

const router = express.Router();

// Every announcement request requires a signed-in household member.
router.use(requireAuthenticatedUser);

// Get the announcement for one selected week.
router.get(
  '/:householdId/announcements',
  requireValidHouseholdId,
  getWeeklyAnnouncement,
);

// Create or update the announcement for one selected week.
router.put(
  '/:householdId/announcements',
  requireValidHouseholdId,
  saveWeeklyAnnouncement,
);

// Delete the announcement for one selected week.
router.delete(
  '/:householdId/announcements',
  requireValidHouseholdId,
  deleteWeeklyAnnouncement,
);

module.exports = router;