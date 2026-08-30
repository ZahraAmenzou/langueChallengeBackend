const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const PlayerSession = require('../models/PlayerSession');
const { generateUniqueCode } = require('../utils/generateCode');
const { isValidLanguage, DEFAULT_LANGUAGE } = require('../config/languages');

const MAX_WORDS = 10;

const cleanLanguage = (language) => (isValidLanguage(language) ? language : DEFAULT_LANGUAGE);

const cleanWords = (words) =>
  words.map((w) => ({
    word: String(w.word || '').trim(),
    correctAnswer: String(w.correctAnswer || '').trim(),
  }));

const findChallenge = async (idOrCode) => {
  if (mongoose.Types.ObjectId.isValid(idOrCode)) {
    const byId = await Challenge.findById(idOrCode);
    if (byId) return byId;
  }
  return Challenge.findOne({ uniqueCode: idOrCode });
};

const createChallenge = async (req, res, next) => {
  try {
    const { title, words, language, translationLanguage } = req.body;

    if (!Array.isArray(words) || words.length !== MAX_WORDS) {
      return res.status(400).json({ success: false, message: `A challenge must contain exactly ${MAX_WORDS} words` });
    }

    const cleaned = cleanWords(words);
    if (cleaned.some((w) => !w.word || !w.correctAnswer)) {
      return res.status(400).json({ success: false, message: 'Every word must have both a word and a correct answer' });
    }

    const uniqueCode = await generateUniqueCode(Challenge);
    const challenge = await Challenge.create({
      title: String(title || '').trim(),
      language: cleanLanguage(language),
      translationLanguage: cleanLanguage(translationLanguage),
      uniqueCode,
      words: cleaned,
      createdBy: req.admin._id,
    });

    res.status(201).json({
      success: true,
      link: `/challenge/${uniqueCode}`,
      challenge: {
        id: challenge._id,
        title: challenge.title,
        language: challenge.language,
        translationLanguage: challenge.translationLanguage,
        uniqueCode: challenge.uniqueCode,
        words: challenge.words.length,
        createdAt: challenge.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getChallenges = async (req, res, next) => {
  try {
    const challenges = await Challenge.find().sort({ createdAt: -1 });

    const aggregation = await PlayerSession.aggregate([
      {
        $group: {
          _id: '$challengeId',
          total: { $sum: 1 },
          completed: { $sum: { $cond: ['$completed', 1, 0] } },
          locked: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$lockedUntil', null] }, { $gt: ['$lockedUntil', new Date()] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const statsMap = {};
    aggregation.forEach((row) => {
      statsMap[String(row._id)] = row;
    });

    const data = challenges.map((challenge) => {
      const stats = statsMap[String(challenge._id)] || { total: 0, completed: 0, locked: 0 };
      return {
        id: challenge._id,
        title: challenge.title,
        language: challenge.language,
        translationLanguage: challenge.translationLanguage,
        uniqueCode: challenge.uniqueCode,
        words: challenge.words.length,
        createdAt: challenge.createdAt,
        status: stats.completed > 0 ? 'Completed' : stats.total > 0 ? 'Active' : 'New',
        totalPlayers: stats.total,
        completedPlayers: stats.completed,
        lockedPlayers: stats.locked,
        link: `/challenge/${challenge.uniqueCode}`,
      };
    });

    res.json({ success: true, challenges: data });
  } catch (error) {
    next(error);
  }
};

const getChallengeById = async (req, res, next) => {
  try {
    const challenge = await findChallenge(req.params.id);
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }
    res.json({
      success: true,
      challenge: {
        id: challenge._id,
        title: challenge.title,
        language: challenge.language,
        translationLanguage: challenge.translationLanguage,
        uniqueCode: challenge.uniqueCode,
        words: challenge.words.map((w) => ({ word: w.word, correctAnswer: w.correctAnswer })),
        createdAt: challenge.createdAt,
        updatedAt: challenge.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateChallenge = async (req, res, next) => {
  try {
    const { title, words, language, translationLanguage } = req.body;
    const challenge = await findChallenge(req.params.id);

    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }

    if (!Array.isArray(words) || words.length !== MAX_WORDS) {
      return res.status(400).json({ success: false, message: `A challenge must contain exactly ${MAX_WORDS} words` });
    }

    const cleaned = cleanWords(words);
    if (cleaned.some((w) => !w.word || !w.correctAnswer)) {
      return res.status(400).json({ success: false, message: 'Every word must have both a word and a correct answer' });
    }

    challenge.title = String(title || '').trim();
    challenge.language = cleanLanguage(language);
    challenge.translationLanguage = cleanLanguage(translationLanguage);
    challenge.words = cleaned;
    await challenge.save();

    res.json({
      success: true,
      link: `/challenge/${challenge.uniqueCode}`,
      challenge: {
        id: challenge._id,
        title: challenge.title,
        language: challenge.language,
        translationLanguage: challenge.translationLanguage,
        uniqueCode: challenge.uniqueCode,
        words: challenge.words.length,
        createdAt: challenge.createdAt,
        updatedAt: challenge.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deleteChallenge = async (req, res, next) => {
  try {
    const challenge = await findChallenge(req.params.id);

    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }

    await PlayerSession.deleteMany({ challengeId: challenge._id });
    await challenge.deleteOne();

    res.json({ success: true, message: 'Challenge deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const sessions = await PlayerSession.find().select('challengeId completed lockedUntil').lean();

    const now = Date.now();
    const activeChallengeIds = new Set();
    const completedChallengeIds = new Set();
    let lockedPlayers = 0;
    let completedSessions = 0;
    let activeSessions = 0;

    sessions.forEach((session) => {
      const isLocked = session.lockedUntil && new Date(session.lockedUntil).getTime() > now;

      activeChallengeIds.add(String(session.challengeId));

      if (session.completed) {
        completedChallengeIds.add(String(session.challengeId));
        completedSessions += 1;
      } else if (!isLocked) {
        activeSessions += 1;
      }

      if (isLocked) lockedPlayers += 1;
    });

    const totalChallenges = await Challenge.countDocuments();

    res.json({
      success: true,
      stats: {
        totalChallenges,
        activeChallenges: activeChallengeIds.size,
        completedChallenges: completedChallengeIds.size,
        lockedPlayers,
        totalPlayers: sessions.length,
        completedSessions,
        activeSessions,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createChallenge,
  getChallenges,
  getChallengeById,
  updateChallenge,
  deleteChallenge,
  getStats,
};
