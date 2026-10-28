const express = require('express');
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
