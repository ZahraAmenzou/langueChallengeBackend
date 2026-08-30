const express = require('express');
const { body } = require('express-validator');
const {
  createChallenge,
  getChallenges,
  getChallengeById,
  updateChallenge,
  deleteChallenge,
  getStats,
} = require('../controllers/challenge.controller');
const protect = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { LANGUAGE_CODES } = require('../config/languages');

const router = express.Router();

router.get('/stats', protect, getStats);

router.get('/', protect, getChallenges);

const languageValidation = body('language')
  .optional()
  .trim()
  .isIn(LANGUAGE_CODES)
  .withMessage(`Unsupported language. Allowed: ${LANGUAGE_CODES.join(', ')}`);

const translationLanguageValidation = body('translationLanguage')
  .optional()
  .trim()
  .isIn(LANGUAGE_CODES)
  .withMessage(`Unsupported translation language. Allowed: ${LANGUAGE_CODES.join(', ')}`);

router.post(
  '/',
  protect,
  [
    body('title').trim().notEmpty().withMessage('Challenge title is required'),
    languageValidation,
    translationLanguageValidation,
    body('words').isArray({ min: 10, max: 10 }).withMessage('A challenge must contain exactly 10 words'),
  ],
  validate,
  createChallenge
);

router.get('/:id', protect, getChallengeById);

router.put(
  '/:id',
  protect,
  [
    body('title').trim().notEmpty().withMessage('Challenge title is required'),
    languageValidation,
    translationLanguageValidation,
    body('words').isArray({ min: 10, max: 10 }).withMessage('A challenge must contain exactly 10 words'),
  ],
  validate,
  updateChallenge
);

router.delete('/:id', protect, deleteChallenge);

module.exports = router;
