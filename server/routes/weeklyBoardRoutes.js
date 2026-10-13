const express = require('express');
const { getWeeklyBoard } = require('../controllers/weeklyBoardController');

const router = express.Router();

router.get('/:householdId/chore-board', getWeeklyBoard);

module.exports = router;