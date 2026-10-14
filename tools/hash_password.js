// tools/hash_password.js
// Node script to generate PBKDF2 (SHA-256) salt + hash compatible with the Workers implementation.
// Usage: node tools/hash_password.js <password>

const crypto = require('crypto');

const password = process.argv[2];
if (!password) {
  console.error('Usage: node tools/hash_password.js <password>');
  process.exit(2);
}

const salt = crypto.randomBytes(16).toString('hex');
const iterations = 120000;
const keylen = 32;
const digest = 'sha256';

const hash = crypto.pbkdf2Sync(password, Buffer.from(salt, 'hex'), iterations, keylen, digest).toString('hex');

console.log(JSON.stringify({ salt, hash, iterations }));
