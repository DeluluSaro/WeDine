#!/usr/bin/env node

const crypto = require('crypto');

console.log('🔐 Generating RFID Security Keys...\n');

// Generate RFID_SECRET_KEY (32 bytes = 64 hex characters)
const rfidSecretKey = crypto.randomBytes(32).toString('hex');

// Generate ADMIN_RFID_KEY (16 bytes = 32 hex characters)
const adminRfidKey = crypto.randomBytes(16).toString('hex');

console.log('📋 Add these to your Vercel Environment Variables:\n');

console.log('RFID_SECRET_KEY=' + rfidSecretKey);
console.log('ADMIN_RFID_KEY=' + adminRfidKey);
console.log('NEXT_PUBLIC_ADMIN_RFID_KEY=' + adminRfidKey);

console.log('\n🔒 Security Notes:');
console.log('• Keep these keys secure and never commit them to version control');
console.log('• Use different keys for development and production');
console.log('• Store them securely in Vercel environment variables');
console.log('• Update Arduino code with the same RFID_SECRET_KEY');

console.log('\n📱 Arduino Code Update:');
console.log('Update this line in esp8266_rfid_payment_improved.ino:');
console.log(`const char* secretKey = "${rfidSecretKey}";`);

console.log('\n✅ Keys generated successfully!');
