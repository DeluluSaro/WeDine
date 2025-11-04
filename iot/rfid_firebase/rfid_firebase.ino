#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
#include <MFRC522.h>
#include <SPI.h>

// ===== CONFIGURATION =====
const char* ssid = "Saravana";
const char* password = "1234567890";
#define FIREBASE_HOST "wedine-1a2a1-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_AUTH "nfLAZp40wx0U12XXLhcMaPgqvWrbnRXrSarFGjTj"
const String SHOP_NAME = "Guvi";
const String DEVICE_ID = "RFID_READER_1";

// RFID pins - SAFE PINS FOR ESP8266
#define RST_PIN D1    // GPIO5
#define SS_PIN D2     // GPIO4

FirebaseData firebaseData;
FirebaseConfig firebaseConfig;
FirebaseAuth firebaseAuth;
MFRC522 mfrc522(SS_PIN, RST_PIN);

String lastCardId = "";
unsigned long lastScanTime = 0;
const unsigned long SCAN_COOLDOWN = 2000;

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println();
  Serial.println("=== RFID FIREBASE SCANNER ===");
  
  // Initialize SPI and RFID
  SPI.begin();
  mfrc522.PCD_Init();
  Serial.println("RFID initialized");
  
  // Connect to WiFi
  connectWiFi();
  
  // Initialize Firebase
  if (WiFi.status() == WL_CONNECTED) {
    firebaseConfig.host = FIREBASE_HOST;
    firebaseConfig.signer.tokens.legacy_token = FIREBASE_AUTH;
    Firebase.begin(&firebaseConfig, &firebaseAuth);
    Firebase.reconnectWiFi(true);
    Serial.println("Firebase initialized");
    
    // Create shop in Firebase
    createShop();
  }
  
  Serial.println("System ready! Place RFID card...");
}

void loop() {
  // Check WiFi
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    return;
  }
  
  // Check for RFID card
  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    String cardId = getCardId();
    
    // Prevent duplicate reads
    if (cardId != lastCardId || (millis() - lastScanTime) > SCAN_COOLDOWN) {
      Serial.println("==================");
      Serial.print("CARD: ");
      Serial.println(cardId);
      Serial.println("==================");
      
      // Send to Firebase
      if (sendToFirebase(cardId)) {
        Serial.println("SUCCESS: Sent to Firebase!");
        lastCardId = cardId;
        lastScanTime = millis();
      } else {
        Serial.println("ERROR: Firebase failed!");
      }
    }
    
    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
  }
  
  delay(100);
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  
  Serial.print("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" Connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println(" Failed!");
  }
}

String getCardId() {
  String cardId = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) cardId += "0";
    cardId += String(mfrc522.uid.uidByte[i], HEX);
  }
  cardId.toUpperCase();
  return cardId;
}

bool sendToFirebase(String cardId) {
  FirebaseJson jsonData;
  jsonData.set("cardId", cardId);
  jsonData.set("shopName", SHOP_NAME);
  jsonData.set("timestamp", String(millis()));
  
  String path = "/shops/" + SHOP_NAME + "/rfidData/" + cardId;
  
  if (Firebase.setJSON(firebaseData, path, jsonData)) {
    return true;
  } else {
    Serial.print("Firebase Error: ");
    Serial.println(firebaseData.errorReason());
    return false;
  }
}

void createShop() {
  FirebaseJson shopData;
  shopData.set("shopId", SHOP_NAME);
  shopData.set("shopName", SHOP_NAME);
  shopData.set("deviceId", DEVICE_ID);
  shopData.set("createdAt", String(millis()));
  shopData.set("status", "active");
  
  String path = "/shops/" + SHOP_NAME;
  
  if (Firebase.setJSON(firebaseData, path, shopData)) {
    Serial.println("Shop created in Firebase");
  } else {
    Serial.print("Shop creation failed: ");
    Serial.println(firebaseData.errorReason());
  }
}