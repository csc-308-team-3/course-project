const express = require('express');
const {
  getSession,
  login,
  logout,
  register,
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/session', getSession);

module.exports = router;
