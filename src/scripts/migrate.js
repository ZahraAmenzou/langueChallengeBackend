require('dotenv').config();
const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const { DEFAULT_LANGUAGE } = require('../config/languages');

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const { modifiedCount } = await Challenge.updateMany(
      { $or: [{ language: { $exists: false } }, { language: null }, { language: '' }] },
      { $set: { language: DEFAULT_LANGUAGE } }
    );

    console.log(`Migration complete. Updated ${modifiedCount} challenge(s) to language "${DEFAULT_LANGUAGE}".`);

    const { modifiedCount: translationCount } = await Challenge.updateMany(
      {
        $or: [{ translationLanguage: { $exists: false } }, { translationLanguage: null }, { translationLanguage: '' }],
      },
      { $set: { translationLanguage: DEFAULT_LANGUAGE } }
    );

    console.log(
      `Migration complete. Updated ${translationCount} challenge(s) to translation language "${DEFAULT_LANGUAGE}".`
    );
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`Migration error: ${error.message}`);
    process.exit(1);
  }
};

migrate();
