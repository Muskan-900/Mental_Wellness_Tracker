const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits for GCM

// Get encryption key from environment, ensure it is 32 bytes (256 bits)
function getEncryptionKey() {
  const hexKey = process.env.ENCRYPTION_KEY || 'd9f3d9e847c1b5a263d8102a0a256d0d50718501e405a7698a87a229a43a0d5c';
  return Buffer.from(hexKey, 'hex');
}

/**
 * Encrypt plain text using AES-256-GCM.
 * Returns a string formatted as: ivHex:authTagHex:encryptedContentHex
 * @param {string} text 
 * @returns {string}
 */
function encrypt(text) {
  if (!text) return '';
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    const ivHex = iv.toString('hex');
    
    return `${ivHex}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt a cipher text string formatted as: ivHex:authTagHex:encryptedContentHex
 * @param {string} encryptedText 
 * @returns {string}
 */
function decrypt(encryptedText) {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      // If the text is not encrypted (e.g. legacy/mock data), return as is
      return encryptedText;
    }
    
    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    // If decryption fails, it could be that it wasn't encrypted, return the original string
    return encryptedText;
  }
}

module.exports = {
  encrypt,
  decrypt
};
