const mongoose = require('mongoose');

const LOCK_DURATION_MS = 5 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 10;

const playerSessionSchema = new mongoose.Schema(
  {
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge',
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    currentQuestion: {
      type: Number,
      default: 0,
      min: 0,
    },
    attemptsRemaining: {
      type: Number,
      default: MAX_ATTEMPTS,
      min: 0,
    },
    gems: {
      type: Number,
      default: 0,
      min: 0,
    },
    bonusAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
    },
    correctAnswers: {
      type: Number,
      default: 0,
      min: 0,
    },
    wrongAnswers: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

playerSessionSchema.methods.isLocked = function () {
  return this.lockedUntil && Date.now() < new Date(this.lockedUntil).getTime();
};

playerSessionSchema.methods.effectiveMaxAttempts = function () {
  return MAX_ATTEMPTS + (this.gems || 0) + (this.bonusAttempts || 0);
};

module.exports = mongoose.model('PlayerSession', playerSessionSchema);
module.exports.LOCK_DURATION_MS = LOCK_DURATION_MS;
module.exports.MAX_ATTEMPTS = MAX_ATTEMPTS;
