const crypto = require('crypto');
const Challenge = require('../models/Challenge');
const PlayerSession = require('../models/PlayerSession');
const { LOCK_DURATION_MS, MAX_ATTEMPTS } = require('../models/PlayerSession');

const POINTS_PER_WORD = 10;

const getChallengeByCode = (code) => Challenge.findOne({ uniqueCode: code });

const normalize = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const buildState = (challenge, session) => {
  const lockedUntil = session.lockedUntil ? new Date(session.lockedUntil).getTime() : null;
  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;
  const currentIndex = Math.min(session.currentQuestion, challenge.words.length - 1);

  return {
    challengeId: challenge._id,
    uniqueCode: challenge.uniqueCode,
    title: challenge.title,
    language: challenge.language,
    totalWords: challenge.words.length,
    currentWord:
      session.currentQuestion < challenge.words.length
        ? challenge.words[currentIndex].word
        : null,
    currentQuestion: session.currentQuestion,
    attemptsRemaining: session.attemptsRemaining,
    gems: session.gems,
    bonusAttempts: session.bonusAttempts,
    totalAttempts: session.effectiveMaxAttempts(),
    score: session.score,
    correctAnswers: session.correctAnswers,
    wrongAnswers: session.wrongAnswers,
    locked: isLocked,
    lockedUntil,
    completed: session.completed,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
  };
};

const maybeUnlock = (session) => {
  if (session.lockedUntil && Date.now() >= new Date(session.lockedUntil).getTime()) {
    session.lockedUntil = null;
    session.attemptsRemaining = session.effectiveMaxAttempts();
    session.wrongAnswers = 0;
    return true;
  }
  return false;
};

const getChallengeStatus = async (req, res, next) => {
  try {
    const challenge = await getChallengeByCode(req.params.id);
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found or has been deleted' });
    }

    res.json({
      success: true,
      challenge: {
        title: challenge.title,
        language: challenge.language,
        uniqueCode: challenge.uniqueCode,
        totalWords: challenge.words.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

const start = async (req, res, next) => {
  try {
    const challenge = await getChallengeByCode(req.params.id);
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found or has been deleted' });
    }

    const playerToken = req.headers['x-player-token'];

    if (playerToken) {
      const existing = await PlayerSession.findOne({ sessionId: playerToken });
      if (existing && String(existing.challengeId) === String(challenge._id)) {
        maybeUnlock(existing);
        await existing.save();
        return res.json({ success: true, playerToken: existing.sessionId, state: buildState(challenge, existing) });
      }
    }

    const session = await PlayerSession.create({
      challengeId: challenge._id,
      sessionId: crypto.randomUUID(),
      currentQuestion: 0,
      attemptsRemaining: MAX_ATTEMPTS,
      score: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
    });

    res.status(201).json({ success: true, playerToken: session.sessionId, state: buildState(challenge, session) });
  } catch (error) {
    next(error);
  }
};

const getState = async (req, res, next) => {
  try {
    const challenge = await getChallengeByCode(req.params.id);
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found or has been deleted' });
    }

    const playerToken = req.headers['x-player-token'];
    if (!playerToken) {
      return res.status(400).json({ success: false, message: 'No active session. Please start the challenge.' });
    }

    const session = await PlayerSession.findOne({ sessionId: playerToken });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found. Please start the challenge again.' });
    }

    if (String(session.challengeId) !== String(challenge._id)) {
      return res.status(400).json({ success: false, message: 'This session does not belong to this challenge' });
    }

    maybeUnlock(session);
    await session.save();

    res.json({ success: true, state: buildState(challenge, session) });
  } catch (error) {
    next(error);
  }
};

const answer = async (req, res, next) => {
  try {
    const challenge = await getChallengeByCode(req.params.id);
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found or has been deleted' });
    }

    const playerToken = req.headers['x-player-token'];
    if (!playerToken) {
      return res.status(401).json({ success: false, message: 'Please start the challenge first' });
    }

    const session = await PlayerSession.findOne({ sessionId: playerToken });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found. Please start the challenge again.' });
    }

    if (String(session.challengeId) !== String(challenge._id)) {
      return res.status(400).json({ success: false, message: 'This session does not belong to this challenge' });
    }

    const now = Date.now();

    if (session.completed) {
      return res.status(400).json({ success: false, message: 'Challenge already completed' });
    }

    maybeUnlock(session);

    if (session.lockedUntil && now < new Date(session.lockedUntil).getTime()) {
      return res.status(423).json({
        success: false,
        code: 'GAME_LOCKED',
        message: 'Challenge is locked',
        lockedUntil: new Date(session.lockedUntil).getTime(),
      });
    }

    const submitted = req.body.answer;
    if (typeof submitted !== 'string' || !submitted.trim()) {
      return res.status(400).json({ success: false, message: 'Answer cannot be empty' });
    }

    if (session.currentQuestion >= challenge.words.length) {
      return res.status(400).json({ success: false, message: 'All questions have already been answered' });
    }

    const currentWord = challenge.words[session.currentQuestion];
    const isCorrect = normalize(currentWord.correctAnswer) === normalize(submitted);

    let locked = false;
    let gemEarned = false;
    let bonusEarned = false;

    if (isCorrect) {
      session.score += POINTS_PER_WORD;
      session.correctAnswers += 1;
      session.currentQuestion += 1;

      session.gems += 1;
      session.attemptsRemaining += 1;
      gemEarned = true;

      if (session.currentQuestion >= challenge.words.length) {
        session.completed = true;
        session.completedAt = new Date(now);
        session.bonusAttempts += 1;
        session.attemptsRemaining += 1;
        bonusEarned = true;
      }
    } else {
      session.wrongAnswers += 1;
      session.attemptsRemaining = Math.max(0, session.attemptsRemaining - 1);

      if (session.attemptsRemaining === 0) {
        session.lockedUntil = new Date(now + LOCK_DURATION_MS);
        locked = true;
      }
    }

    await session.save();

    res.json({
      success: true,
      correct: isCorrect,
      locked,
      gemEarned,
      bonusEarned,
      message: isCorrect ? 'CORRECT' : 'WRONG',
      state: buildState(challenge, session),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getChallengeStatus, start, getState, answer };
