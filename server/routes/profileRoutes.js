const express = require('express');
const {
  getProfile,
  updateProfile,
} = require('../controllers/profileController');

const router = express.Router();

router.get('/me', getProfile);
router.patch('/me', updateProfile);

module.exports = router;