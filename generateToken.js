const jwt = require('jsonwebtoken');
const fs = require('fs');

// Your credentials from Apple Developer Portal
const teamId = 'RCGWX9FZ7P';          // Your Team ID (from token)
const keyId = '523JBZHH99';            // Your Key ID (from token)
const privateKeyPath = './AuthKey_Q6BKB8RHGX.p8';  // Path to your .p8 file

// Read the private key
const privateKey = fs.readFileSync(privateKeyPath);

// Create the token
const token = jwt.sign(
  {
    iss: teamId,
    iat: Math.floor(Date.now() / 1000),  // Issued at (now)
    exp: Math.floor(Date.now() / 1000) + (180 * 24 * 60 * 60)  // Expires in 180 days (6 months)
  },
  privateKey,
  {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: keyId
    }
  }
);

console.log('\n✅ Generated Developer Token:');
console.log('\n' + token + '\n');
console.log('📅 Expires:', new Date((Math.floor(Date.now() / 1000) + (180 * 24 * 60 * 60)) * 1000).toDateString());
console.log('\n📋 Copy this token into src/musickit.jsx\n');

