const express = require('express');
const {
  completeChoreInstance,
  getChoreHistory,
  getMonthlyStatistics,
} = require('../controllers/choreHistoryController');
const {
  requireAuthenticatedUser,
  requireValidHouseholdId,
} = require('../controllers/householdController');
const { isValidUuid } = require('../utils/householdValidation');

const router = express.Router();

router.use(requireAuthenticatedUser);

function requireValidRecordId(parameter) {
  return (request, response, next) => {
    if (!isValidUuid(request.params[parameter])) {
      return response.status(400).json({
        error: `${parameter} must be a valid UUID.`,
      });
    }

    return next();
  };
}

router.post(
  '/:householdId/chore-instances/:instanceId/complete',
  requireValidHouseholdId,
  requireValidRecordId('instanceId'),
  completeChoreInstance,
);

router.get(
  '/:householdId/chores/:choreId/history',
  requireValidHouseholdId,
  requireValidRecordId('choreId'),
  getChoreHistory,
);

router.get(
  '/:householdId/chore-statistics',
  requireValidHouseholdId,
  getMonthlyStatistics,
);

module.exports = router;
