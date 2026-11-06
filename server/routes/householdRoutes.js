const express = require('express');
const { createChore } = require('../controllers/choreController');
const {
  createHousehold,
  getCurrentHousehold,
  joinHousehold,
  leaveHousehold,
  requireAuthenticatedUser,
  requireValidHouseholdId,
  rotateInviteCode,
} = require('../controllers/householdController');

const router = express.Router();

router.use(requireAuthenticatedUser);

router.post('/:householdId/chores', requireValidHouseholdId, createChore);
router.post('/', createHousehold);
router.get('/me', getCurrentHousehold);
router.post('/join', joinHousehold);
router.post('/:householdId/leave', requireValidHouseholdId, leaveHousehold);
router.post(
  '/:householdId/invite-code',
  requireValidHouseholdId,
  rotateInviteCode,
);

module.exports = router;