const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function generateCode(length = 8) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

async function generateUniqueCode(ChallengeModel, length = 8) {
  let code;
  do {
    code = generateCode(length);
  } while ((await ChallengeModel.exists({ uniqueCode: code })) !== null);
  return code;
}

module.exports = { generateCode, generateUniqueCode };
