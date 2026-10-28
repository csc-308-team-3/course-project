const express = require('express');
const { getWeeklyBoard } = require('../controllers/weeklyBoardController');

const router = express.Router();

router.get('/:householdId/api/leaderboard', getWeeklyBoard);

module.exports = router;