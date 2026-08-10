const express = require('express');
const {
  getChallengeStatus,
  start,
  getState,
  answer,
} = require('../controllers/player.controller');
const { answerLimiter, playerLimiter } = require('../middleware/rateLimit.middleware');

const router = express.Router();

router.get('/challenges/:id/status', getChallengeStatus);

router.post('/challenges/:id/start', playerLimiter, start);

router.get('/challenges/:id/state', playerLimiter, getState);

router.post('/challenges/:id/answer', answerLimiter, answer);

module.exports = router;
