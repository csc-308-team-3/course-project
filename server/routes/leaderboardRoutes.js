const express = require('express');
const {
  requireAuthenticatedUser,
  requireValidHouseholdId,
} = require('../controllers/householdController');
const { getLeaderboard } = require('../controllers/leaderboardController');

const router = express.Router();

router.get(
  '/:householdId/leaderboard',
  requireAuthenticatedUser,
  requireValidHouseholdId,
  getLeaderboard,
);

module.exports = router;
