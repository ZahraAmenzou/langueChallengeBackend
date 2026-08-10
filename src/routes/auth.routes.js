const express = require('express');
const { body } = require('express-validator');
const { login, getMe } = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const protect = require('../middleware/auth.middleware');

const router = express.Router();

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

router.get('/me', protect, getMe);

module.exports = router;
