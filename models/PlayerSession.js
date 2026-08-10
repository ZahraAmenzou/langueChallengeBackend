const mongoose = require('mongoose');

const LOCK_DURATION_MS = 5 * 60 * 60 * 1000;

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
      default: 3,
      min: 0,
      max: 3,
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

module.exports = mongoose.model('PlayerSession', playerSessionSchema);
module.exports.LOCK_DURATION_MS = LOCK_DURATION_MS;
