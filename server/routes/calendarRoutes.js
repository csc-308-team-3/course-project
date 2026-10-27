const express = require('express');
const { getCalendarChores } = require('../controllers/calendarController');
const {
  requireAuthenticatedUser,
  requireValidHouseholdId,
} = require('../controllers/householdController');

const router = express.Router();

router.use(requireAuthenticatedUser);

router.get(
  '/:householdId/calendar',
  requireValidHouseholdId,
  getCalendarChores,
);

module.exports = router;