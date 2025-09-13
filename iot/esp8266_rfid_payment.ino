/*
 * WeDine RFID Payment System
 * ESP8266 + RC522 RFID Module
 * 
 * Hardware Connections:
 * RC522    ESP8266
 * VCC  ->  3.3V
 * GND  ->  GND
 * RST  ->  D1 (GPIO5)
 * SS   ->  D2 (GPIO4)
 * MOSI ->  D7 (GPIO13)
 * MISO ->  D6 (GPIO12)
 * SCK  ->  D5 (GPIO14)
 * 
 * Features:
 * - RFID card scanning
 * - Secure communication with backend
 * - Payment processing
 * - Status LED indicators
 * - Buzzer feedback
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>
#include <EEPROM.h>

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Backend Configuration
const char* serverUrl = "https://your-domain.com"; // Replace with your domain
const char* rfidEndpoint = "/api/payment/rfid";
const char* statusEndpoint = "/api/payment/rfid/status";

// Hardware Pins
#define RST_PIN D1
#define SS_PIN D2
#define BUZZER_PIN D3
#define LED_GREEN D4
#define LED_RED D5
#define LED_BLUE D6
#define BUTTON_PIN D7

// RFID Configuration
MFRC522 mfrc522(SS_PIN, RST_PIN);

// Security Configuration
const char* secretKey = "YOUR_RFID_SECRET_KEY"; // Must match backend
const char* deviceId = "SHOP_001"; // Unique device identifier

// State Management
bool paymentMode = false;
bool lastButtonState = false;
unsigned long lastCardRead = 0;
const unsigned long cardReadDelay = 2000; // 2 seconds between reads

// Order Management
String currentOrderId = "";
float currentAmount = 0.0;
String currentShopId = "";

void setup() {
  Serial.begin(115200);
  Serial.println("WeDine RFID Payment System Starting...");
  
  // Initialize hardware
  initializeHardware();
  
  // Initialize WiFi
  initializeWiFi();
  
  // Initialize RFID
  initializeRFID();
  
  // Load configuration from EEPROM
  loadConfiguration();
  
  Serial.println("System Ready!");
  indicateSystemReady();
}

void loop() {
  // Check button for payment mode toggle
  checkPaymentModeButton();
  
  // Handle RFID card reading
  handleRFIDReading();
  
  // Handle WiFi reconnection
  if (WiFi.status() != WL_CONNECTED) {
    reconnectWiFi();
  }
  
  delay(100);
}

void initializeHardware() {
  // Initialize pins
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(LED_BLUE, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // Initialize EEPROM
  EEPROM.begin(512);
  
  // Turn off all LEDs initially
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_RED, LOW);
  digitalWrite(LED_BLUE, LOW);
  
  Serial.println("Hardware initialized");
}

void initializeWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    blinkLED(LED_BLUE, 3, 200);
  } else {
    Serial.println();
    Serial.println("WiFi connection failed!");
    blinkLED(LED_RED, 5, 200);
  }
}

void initializeRFID() {
  SPI.begin();
  mfrc522.PCD_Init();
  mfrc522.PCD_DumpVersionToSerial();
  Serial.println("RFID module initialized");
}

void loadConfiguration() {
  // Load shop configuration from EEPROM
  // This should be set via admin interface
  currentShopId = "SHOP_001"; // Default shop ID
  Serial.println("Configuration loaded");
}

void checkPaymentModeButton() {
  bool currentButtonState = !digitalRead(BUTTON_PIN);
  
  if (currentButtonState && !lastButtonState) {
    // Button pressed
    paymentMode = !paymentMode;
    
    if (paymentMode) {
      Serial.println("Payment mode ENABLED");
      indicatePaymentModeEnabled();
    } else {
      Serial.println("Payment mode DISABLED");
      indicatePaymentModeDisabled();
    }
  }
  
  lastButtonState = currentButtonState;
}

void handleRFIDReading() {
  if (!paymentMode) {
    return;
  }
  
  // Check if a new card is present
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }
  
  // Check if a card is selected
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }
  
  // Prevent multiple reads of the same card
  if (millis() - lastCardRead < cardReadDelay) {
    return;
  }
  
  lastCardRead = millis();
  
  // Read card UID
  String cardId = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) {
      cardId += "0";
    }
    cardId += String(mfrc522.uid.uidByte[i], HEX);
  }
  cardId.toUpperCase();
  
  Serial.println("Card detected: " + cardId);
  
  // Process payment
  processRFIDPayment(cardId);
  
  // Halt PICC
  mfrc522.PICC_HaltA();
  // Stop encryption on PCD
  mfrc522.PCD_StopCrypto1();
}

void processRFIDPayment(String cardId) {
  if (currentOrderId == "" || currentAmount <= 0) {
    Serial.println("No active order for payment");
    indicateError("No active order");
    return;
  }
  
  Serial.println("Processing payment for card: " + cardId);
  indicateProcessing();
  
  // Create payment request
  String paymentData = createPaymentRequest(cardId);
  
  // Send payment request to backend
  bool success = sendPaymentRequest(paymentData);
  
  if (success) {
    Serial.println("Payment successful!");
    indicateSuccess();
    resetOrder();
  } else {
    Serial.println("Payment failed!");
    indicateError("Payment failed");
  }
}

String createPaymentRequest(String cardId) {
  // Create timestamp
  unsigned long timestamp = millis();
  
  // Create signature for security
  String signature = createSignature(cardId, currentOrderId, currentAmount, timestamp);
  
  // Create JSON payload
  DynamicJsonDocument doc(1024);
  doc["rfidCardId"] = cardId;
  doc["orderId"] = currentOrderId;
  doc["shopId"] = currentShopId;
  doc["totalAmount"] = currentAmount;
  doc["timestamp"] = timestamp;
  doc["signature"] = signature;
  doc["deviceId"] = deviceId;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  return jsonString;
}

String createSignature(String cardId, String orderId, float amount, unsigned long timestamp) {
  String data = cardId + orderId + String(amount) + String(timestamp);
  
  // Simple hash function (in production, use proper crypto)
  unsigned long hash = 0;
  for (int i = 0; i < data.length(); i++) {
    hash = hash * 31 + data.charAt(i);
  }
  
  return String(hash, HEX);
}

bool sendPaymentRequest(String paymentData) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected");
    return false;
  }
  
  WiFiClientSecure client;
  client.setInsecure(); // For testing only - use proper SSL in production
  
  HTTPClient http;
  http.begin(client, serverUrl + String(rfidEndpoint));
  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "WeDine-RFID-Device");
  
  int httpResponseCode = http.POST(paymentData);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("HTTP Response Code: " + String(httpResponseCode));
    Serial.println("Response: " + response);
    
    // Parse response
    DynamicJsonDocument responseDoc(1024);
    deserializeJson(responseDoc, response);
    
    bool success = responseDoc["success"];
    if (success) {
      Serial.println("Payment processed successfully");
      return true;
    } else {
      String message = responseDoc["message"];
      Serial.println("Payment failed: " + message);
      return false;
    }
  } else {
    Serial.println("HTTP Error: " + String(httpResponseCode));
    return false;
  }
  
  http.end();
}

void indicateSystemReady() {
  // Green LED solid for 2 seconds
  digitalWrite(LED_GREEN, HIGH);
  delay(2000);
  digitalWrite(LED_GREEN, LOW);
  
  // Buzzer beep
  tone(BUZZER_PIN, 1000, 200);
}

void indicatePaymentModeEnabled() {
  // Blue LED solid
  digitalWrite(LED_BLUE, HIGH);
  
  // Buzzer double beep
  tone(BUZZER_PIN, 1500, 100);
  delay(150);
  tone(BUZZER_PIN, 1500, 100);
}

void indicatePaymentModeDisabled() {
  // Turn off blue LED
  digitalWrite(LED_BLUE, LOW);
  
  // Buzzer single beep
  tone(BUZZER_PIN, 800, 200);
}

void indicateProcessing() {
  // Blink blue LED rapidly
  for (int i = 0; i < 6; i++) {
    digitalWrite(LED_BLUE, HIGH);
    delay(100);
    digitalWrite(LED_BLUE, LOW);
    delay(100);
  }
}

void indicateSuccess() {
  // Green LED solid
  digitalWrite(LED_GREEN, HIGH);
  
  // Success buzzer pattern
  tone(BUZZER_PIN, 2000, 200);
  delay(300);
  tone(BUZZER_PIN, 2000, 200);
  
  delay(2000);
  digitalWrite(LED_GREEN, LOW);
}

void indicateError(String error) {
  // Red LED solid
  digitalWrite(LED_RED, HIGH);
  
  // Error buzzer pattern
  tone(BUZZER_PIN, 500, 500);
  
  delay(2000);
  digitalWrite(LED_RED, LOW);
}

void blinkLED(int pin, int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(pin, HIGH);
    delay(delayMs);
    digitalWrite(pin, LOW);
    delay(delayMs);
  }
}

void resetOrder() {
  currentOrderId = "";
  currentAmount = 0.0;
  Serial.println("Order reset");
}

void reconnectWiFi() {
  Serial.println("Reconnecting to WiFi...");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 10) {
    delay(1000);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi reconnected!");
    blinkLED(LED_BLUE, 2, 200);
  } else {
    Serial.println();
    Serial.println("WiFi reconnection failed!");
    blinkLED(LED_RED, 3, 200);
  }
}

// Function to set order details (called from web interface or admin panel)
void setOrderDetails(String orderId, float amount) {
  currentOrderId = orderId;
  currentAmount = amount;
  Serial.println("Order set - ID: " + orderId + ", Amount: " + String(amount));
}

// Function to get device status
String getDeviceStatus() {
  DynamicJsonDocument status(512);
  status["deviceId"] = deviceId;
  status["paymentMode"] = paymentMode;
  status["wifiConnected"] = (WiFi.status() == WL_CONNECTED);
  status["currentOrder"] = currentOrderId;
  status["currentAmount"] = currentAmount;
  status["uptime"] = millis();
  
  String statusString;
  serializeJson(status, statusString);
  return statusString;
}
