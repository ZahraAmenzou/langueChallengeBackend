const mongoose = require('mongoose');
const { LANGUAGE_CODES, DEFAULT_LANGUAGE } = require('../config/languages');

const wordSchema = new mongoose.Schema(
  {
    word: {
      type: String,
      required: [true, 'Word is required'],
      trim: true,
      maxlength: [120, 'Word cannot exceed 120 characters'],
    },
    correctAnswer: {
      type: String,
      required: [true, 'Correct answer is required'],
      trim: true,
      maxlength: [200, 'Answer cannot exceed 200 characters'],
    },
  },
  { _id: false }
);

const challengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Challenge title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    language: {
      type: String,
      required: true,
      enum: { values: LANGUAGE_CODES, message: `Unsupported language. Allowed: ${LANGUAGE_CODES.join(', ')}` },
      default: DEFAULT_LANGUAGE,
      index: true,
    },
    translationLanguage: {
      type: String,
      required: true,
      enum: { values: LANGUAGE_CODES, message: `Unsupported translation language. Allowed: ${LANGUAGE_CODES.join(', ')}` },
      default: DEFAULT_LANGUAGE,
    },
    uniqueCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    words: {
      type: [wordSchema],
      validate: {
        validator: (words) => words.length === 10,
        message: 'A challenge must contain exactly 10 words',
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Challenge', challengeSchema);
