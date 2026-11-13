const express = require('express');
const { getBoard } = require('../controllers/boardOfShameController');

const router = express.Router();

router.get('/:householdId/board-of-shame', getBoard);

module.exports = router;
