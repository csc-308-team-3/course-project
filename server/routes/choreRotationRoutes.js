const express = require('express');
const {
  generateChoreRotations,
} = require('../controllers/choreRotationController');
const {
  requireAuthenticatedUser,
  requireValidHouseholdId,
} = require('../controllers/householdController');

const router = express.Router();

router.use(requireAuthenticatedUser);

router.post(
  '/:householdId/chore-rotations/generate',
  requireValidHouseholdId,
  generateChoreRotations,
);

module.exports = router;