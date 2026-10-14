const express = require('express');
const {
  createChore,
  deleteChore,
  getChore,
  listChores,
  requireHouseholdMember,
  requireValidChoreId,
  updateChore,
} = require('../controllers/choreController');

const router = express.Router();

router.use('/:householdId/chores', requireHouseholdMember);

router.post('/:householdId/chores', createChore);
router.get('/:householdId/chores', listChores);
router.get('/:householdId/chores/:choreId', requireValidChoreId, getChore);
router.patch('/:householdId/chores/:choreId', requireValidChoreId, updateChore);
router.delete(
  '/:householdId/chores/:choreId',
  requireValidChoreId,
  deleteChore,
);

module.exports = router;
