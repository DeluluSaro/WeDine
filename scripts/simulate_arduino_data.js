// Simulate Arduino RFID data sending to Firebase
// Run with: node scripts/simulate_arduino_data.js

const https = require('https');

// Configuration
const FIREBASE_HOST = 'your-project.firebaseio.com';
const FIREBASE_AUTH = 'your-firebase-auth-token';
const SHOP_NAME = 'Test Shop';

// Simulate RFID card data
const rfidCards = [
  'A1B2C3D4',
  'E5F6G7H8',
  'I9J0K1L2',
  'M3N4O5P6',
  'Q7R8S9T0'
];

let cardIndex = 0;

function sendToFirebase(cardId) {
  const timestamp = new Date().toISOString();
  
  const data = {
    cardId: cardId,
    timestamp: timestamp,
    deviceId: 'ESP8266_RFID_READER',
    studentName: '',
    userEmail: '',
    isVerified: false
  };

  const jsonData = JSON.stringify(data);
  const path = `/shops/${SHOP_NAME}/rfidData/${cardId}.json?auth=${FIREBASE_AUTH}`;
  
  const options = {
    hostname: FIREBASE_HOST,
    port: 443,
    path: path,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(jsonData)
    }
  };

  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Card ${cardId} sent to Firebase at ${timestamp}`);
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.write(jsonData);
  req.end();
}

function simulateScan() {
  const cardId = rfidCards[cardIndex % rfidCards.length];
  console.log(`\n--- Simulating RFID Scan ---`);
  console.log(`Card ID: ${cardId}`);
  console.log(`Time: ${new Date().toLocaleString()}`);
  
  sendToFirebase(cardId);
  
  cardIndex++;
}

// Simulate scans every 5 seconds
console.log('Starting Arduino RFID simulation...');
console.log('Press Ctrl+C to stop');
console.log(`Shop: ${SHOP_NAME}`);
console.log(`Firebase Host: ${FIREBASE_HOST}`);

// Initial scan
simulateScan();

// Continue scanning every 5 seconds
const interval = setInterval(simulateScan, 5000);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\nSimulation stopped.');
  clearInterval(interval);
  process.exit(0);
});
