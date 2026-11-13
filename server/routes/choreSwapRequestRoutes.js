const express = require('express');
const {
  cancelChoreSwapRequest,
  createChoreSwapRequest,
  getIncomingChoreSwapRequests,
  respondToChoreSwapRequest,
} = require('../controllers/choreSwapRequestController');
const {
  requireAuthenticatedUser,
  requireValidHouseholdId,
} = require('../controllers/householdController');

const router = express.Router();

router.use(requireAuthenticatedUser);

router.get(
  '/:householdId/chore-swap-requests',
  requireValidHouseholdId,
  getIncomingChoreSwapRequests,
);
router.post(
  '/:householdId/chore-instances/:instanceId/chore-swap-requests',
  requireValidHouseholdId,
  createChoreSwapRequest,
);
router.post(
  '/:householdId/chore-swap-requests/:requestId/respond',
  requireValidHouseholdId,
  respondToChoreSwapRequest,
);
router.post(
  '/:householdId/chore-swap-requests/:requestId/cancel',
  requireValidHouseholdId,
  cancelChoreSwapRequest,
);

module.exports = router;
