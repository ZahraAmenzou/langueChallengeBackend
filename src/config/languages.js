const LANGUAGES = {
  tachelhit: {
    code: 'tachelhit',
    label: 'Tachelhit',
    nativeName: 'Tachelhit',
    bcp47: 'zgh',
    flag: '🌐',
  },
  french: {
    code: 'french',
    label: 'French',
    nativeName: 'Français',
    bcp47: 'fr',
    flag: '🇫🇷',
  },
  english: {
    code: 'english',
    label: 'English',
    nativeName: 'English',
    bcp47: 'en',
    flag: '🇬🇧',
  },
  german: {
    code: 'german',
    label: 'German',
    nativeName: 'Deutsch',
    bcp47: 'de',
    flag: '🇩🇪',
  },
};

const LANGUAGE_CODES = Object.keys(LANGUAGES);
const DEFAULT_LANGUAGE = 'tachelhit';

const isValidLanguage = (code) => LANGUAGE_CODES.includes(code);

module.exports = { LANGUAGES, LANGUAGE_CODES, DEFAULT_LANGUAGE, isValidLanguage };
