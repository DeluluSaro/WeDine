# 🏪 Complete RFID Payment System Guide

## **📋 Table of Contents**
1. [How to Find RFID Card Serial Number](#how-to-find-rfid-card-serial-number)
2. [RFID Detection Methods](#rfid-detection-methods)
3. [Arduino Code Setup](#arduino-code-setup)
4. [Payment Integration with Razorpay](#payment-integration-with-razorpay)
5. [Shop Owner Dashboard](#shop-owner-dashboard)
6. [Complete Workflow](#complete-workflow)

---

## **🔍 How to Find RFID Card Serial Number**

### **Method 1: Using NFC-Enabled Phone (Recommended)**

1. **Check if your phone supports NFC:**
   - Android: Settings → Connected devices → Connection preferences → NFC
   - iPhone: Settings → General → NFC (iPhone 7 and newer)

2. **Enable NFC:**
   - Turn on NFC in your device settings
   - Ensure NFC is enabled for apps

3. **Use WeDine RFID Finder:**
   - Visit: `https://your-domain.com/rfid-finder`
   - Tap "Scan RFID Card" button
   - Place your college ID card on the back of your phone
   - Copy the detected serial number

### **Method 2: Manual Detection (Non-NFC Phones)**

1. **Contact Your College:**
   - Ask IT department for your RFID serial number
   - Check student portal or ID card documentation
   - Look for any stickers or labels on your ID card

2. **Use Alternative Device:**
   - Ask a friend with NFC-enabled phone to scan your card
   - Use the WeDine RFID Finder on their device

3. **Check Card Documentation:**
   - Look for any printed numbers on your ID card
   - Check if there's a QR code that contains the serial

### **Method 3: Using Arduino Device**

1. **Connect Arduino with RFID reader**
2. **Upload the detection code (provided below)**
3. **Place your card on the reader**
4. **Check serial monitor for the card ID**

---

## **📱 RFID Detection Methods**

### **Web-Based Detection (NFC)**

```html
<!-- Add this to your HTML for NFC detection -->
<script>
async function detectRFID() {
  if ('NDEFReader' in window) {
    try {
      const ndef = new NDEFReader();
      await ndef.scan();
      
      ndef.addEventListener('reading', (event) => {
        const serialNumber = event.serialNumber;
        console.log('RFID Detected:', serialNumber);
        document.getElementById('rfid-serial').value = serialNumber;
      });
    } catch (error) {
      console.error('NFC Error:', error);
    }
  } else {
    alert('NFC not supported on this device');
  }
}
</script>
```

### **Arduino-Based Detection**

```cpp
// Simple RFID detection code for Arduino
#include <SPI.h>
#include <MFRC522.h>

#define RST_PIN 9
#define SS_PIN 10

MFRC522 mfrc522(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(9600);
  SPI.begin();
  mfrc522.PCD_Init();
  Serial.println("RFID Reader Ready - Place your card");
}

void loop() {
  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    String cardId = "";
    for (byte i = 0; i < mfrc522.uid.size; i++) {
      if (mfrc522.uid.uidByte[i] < 0x10) cardId += "0";
      cardId += String(mfrc522.uid.uidByte[i], HEX);
    }
    cardId.toUpperCase();
    Serial.println("Card ID: " + cardId);
    delay(2000);
  }
}
```

---

## **🔧 Arduino Code Setup**

### **Complete Arduino Code for RFID Payment System**

```cpp
/*
 * WeDine RFID Payment System - Complete Version
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
 * Additional Components:
 * - Buzzer: D0 (GPIO16)
 * - Green LED: D4 (GPIO2)
 * - Red LED: D8 (GPIO15)
 * - Blue LED: D9 (GPIO3)
 * - Button: D10 (GPIO1)
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>
#include <EEPROM.h>
#include <ESP8266WebServer.h>

// WiFi Configuration - UPDATE THESE
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Backend Configuration - UPDATE THESE
const char* serverUrl = "https://your-vercel-app.vercel.app"; // Your Vercel URL
const char* rfidEndpoint = "/api/payment/rfid/improved";
const char* razorpayEndpoint = "/api/razorpay/create-payment";

// Hardware Pins
#define RST_PIN D1
#define SS_PIN D2
#define BUZZER_PIN D0
#define LED_GREEN D4
#define LED_RED D8
#define LED_BLUE D9
#define BUTTON_PIN D10

// RFID Configuration
MFRC522 mfrc522(SS_PIN, RST_PIN);

// Security Configuration - UPDATE THESE
const char* secretKey = "03ba3188bdb6562d2eaef753cc7bc8aae0dfd843ef0c45a1b5401262a103ddae";
const char* deviceId = "SHOP_001"; // Change for each shop
const char* shopId = "SHOP_001"; // Your shop ID

// Web Server
ESP8266WebServer server(80);

// State Management
bool paymentMode = false;
bool lastButtonState = false;
unsigned long lastCardRead = 0;
const unsigned long cardReadDelay = 3000;

// Order Management
String currentOrderId = "";
float currentAmount = 0.0;
bool orderActive = false;

// System Status
bool systemReady = false;

void setup() {
  Serial.begin(115200);
  Serial.println("WeDine RFID Payment System Starting...");
  
  initializeHardware();
  initializeWiFi();
  initializeRFID();
  initializeWebServer();
  
  systemReady = true;
  Serial.println("System Ready!");
  indicateSystemReady();
}

void loop() {
  server.handleClient();
  checkPaymentModeButton();
  
  if (paymentMode && orderActive) {
    handleRFIDReading();
  }
  
  delay(100);
}

void initializeHardware() {
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(LED_BLUE, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  EEPROM.begin(512);
  
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

void initializeWebServer() {
  server.on("/", handleRoot);
  server.on("/set-order", HTTP_POST, handleSetOrder);
  server.on("/status", handleStatus);
  server.on("/reset", HTTP_POST, handleReset);
  server.on("/create-razorpay", HTTP_POST, handleCreateRazorpay);
  
  server.begin();
  Serial.println("Web server started");
}

void handleRoot() {
  String html = "<!DOCTYPE html><html><head><title>WeDine RFID Payment</title>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<style>body{font-family:Arial;margin:20px;background:#f0f0f0;}";
  html += ".container{max-width:600px;margin:0 auto;background:white;padding:20px;border-radius:10px;}";
  html += "button{background:#007bff;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;margin:5px;}";
  html += "input{width:100%;padding:10px;margin:5px 0;border:1px solid #ddd;border-radius:5px;box-sizing:border-box;}";
  html += ".status{background:#e8f5e8;padding:10px;border-radius:5px;margin:10px 0;}";
  html += ".error{background:#ffe8e8;padding:10px;border-radius:5px;margin:10px 0;}";
  html += "</style></head><body>";
  html += "<div class='container'>";
  html += "<h1>WeDine RFID Payment System</h1>";
  
  if (paymentMode) {
    html += "<div class='status'>Payment Mode: ENABLED</div>";
  } else {
    html += "<div class='error'>Payment Mode: DISABLED</div>";
  }
  
  if (orderActive) {
    html += "<div class='status'>Order Active: " + currentOrderId + " - ₹" + String(currentAmount) + "</div>";
  } else {
    html += "<div class='error'>No Active Order</div>";
  }
  
  html += "<h3>Set New Order</h3>";
  html += "<form action='/set-order' method='POST'>";
  html += "<input type='text' name='orderId' placeholder='Order ID' required>";
  html += "<input type='number' name='amount' placeholder='Amount' step='0.01' required>";
  html += "<button type='submit'>Set Order</button>";
  html += "</form>";
  
  html += "<h3>Payment Options</h3>";
  html += "<button onclick='createRazorpayPayment()'>Create Razorpay Payment</button>";
  html += "<button onclick='location.reload()'>Refresh Status</button>";
  html += "<button onclick='resetOrder()'>Reset Order</button>";
  
  html += "<h3>Device Status</h3>";
  html += "<p>WiFi: " + String(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected") + "</p>";
  html += "<p>IP: " + WiFi.localIP().toString() + "</p>";
  html += "<p>Uptime: " + String(millis() / 1000) + " seconds</p>";
  
  html += "</div>";
  html += "<script>";
  html += "function resetOrder(){fetch('/reset',{method:'POST'}).then(()=>location.reload());}";
  html += "function createRazorpayPayment(){";
  html += "  if(!'" + currentOrderId + "'){alert('Please set an order first');return;}";
  html += "  fetch('/create-razorpay',{method:'POST',headers:{'Content-Type':'application/json'},";
  html += "    body:JSON.stringify({orderId:'" + currentOrderId + "',amount:" + String(currentAmount) + "})";
  html += "  }).then(r=>r.json()).then(d=>{";
  html += "    if(d.success){";
  html += "      alert('Payment created! Check your shop dashboard for payment link.');";
  html += "    }else{";
  html += "      alert('Error: '+d.message);";
  html += "    }";
  html += "  });";
  html += "}";
  html += "</script>";
  html += "</body></html>";
  
  server.send(200, "text/html", html);
}

void handleSetOrder() {
  if (server.hasArg("orderId") && server.hasArg("amount")) {
    currentOrderId = server.arg("orderId");
    currentAmount = server.arg("amount").toFloat();
    orderActive = true;
    
    Serial.println("Order set - ID: " + currentOrderId + ", Amount: " + String(currentAmount));
    server.send(200, "application/json", "{\"success\":true,\"message\":\"Order set successfully\"}");
  } else {
    server.send(400, "application/json", "{\"success\":false,\"message\":\"Missing order ID or amount\"}");
  }
}

void handleStatus() {
  DynamicJsonDocument status(1024);
  status["deviceId"] = deviceId;
  status["paymentMode"] = paymentMode;
  status["orderActive"] = orderActive;
  status["currentOrderId"] = currentOrderId;
  status["currentAmount"] = currentAmount;
  status["wifiConnected"] = (WiFi.status() == WL_CONNECTED);
  status["systemReady"] = systemReady;
  status["uptime"] = millis();
  
  String statusString;
  serializeJson(status, statusString);
  server.send(200, "application/json", statusString);
}

void handleReset() {
  resetOrder();
  server.send(200, "application/json", "{\"success\":true,\"message\":\"Order reset\"}");
}

void handleCreateRazorpay() {
  if (!orderActive || currentOrderId == "" || currentAmount <= 0) {
    server.send(400, "application/json", "{\"success\":false,\"message\":\"No active order\"}");
    return;
  }
  
  // Create Razorpay payment
  String paymentData = createRazorpayPaymentRequest();
  bool success = sendRazorpayRequest(paymentData);
  
  if (success) {
    server.send(200, "application/json", "{\"success\":true,\"message\":\"Razorpay payment created successfully\"}");
  } else {
    server.send(500, "application/json", "{\"success\":false,\"message\":\"Failed to create Razorpay payment\"}");
  }
}

String createRazorpayPaymentRequest() {
  DynamicJsonDocument doc(1024);
  doc["orderId"] = currentOrderId;
  doc["amount"] = currentAmount;
  doc["shopId"] = shopId;
  doc["deviceId"] = deviceId;
  doc["timestamp"] = millis();
  
  String jsonString;
  serializeJson(doc, jsonString);
  return jsonString;
}

bool sendRazorpayRequest(String paymentData) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected");
    return false;
  }
  
  WiFiClientSecure client;
  client.setInsecure();
  
  HTTPClient http;
  http.begin(client, serverUrl + String(razorpayEndpoint));
  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "WeDine-RFID-Device");
  http.setTimeout(10000);
  
  int httpResponseCode = http.POST(paymentData);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Razorpay Response: " + response);
    
    DynamicJsonDocument responseDoc(1024);
    deserializeJson(responseDoc, response);
    
    bool success = responseDoc["success"];
    if (success) {
      Serial.println("Razorpay payment created successfully");
      return true;
    } else {
      String message = responseDoc["message"];
      Serial.println("Razorpay error: " + message);
      return false;
    }
  } else {
    Serial.println("HTTP Error: " + String(httpResponseCode));
    return false;
  }
  
  http.end();
}

void checkPaymentModeButton() {
  bool currentButtonState = !digitalRead(BUTTON_PIN);
  
  if (currentButtonState && !lastButtonState) {
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
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }
  
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }
  
  if (millis() - lastCardRead < cardReadDelay) {
    return;
  }
  
  lastCardRead = millis();
  
  String cardId = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) {
      cardId += "0";
    }
    cardId += String(mfrc522.uid.uidByte[i], HEX);
  }
  cardId.toUpperCase();
  
  Serial.println("Card detected: " + cardId);
  processRFIDPayment(cardId);
  
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}

void processRFIDPayment(String cardId) {
  if (!orderActive || currentOrderId == "" || currentAmount <= 0) {
    Serial.println("No active order for payment");
    indicateError("No active order");
    return;
  }
  
  Serial.println("Processing payment for card: " + cardId);
  indicateProcessing();
  
  String paymentData = createPaymentRequest(cardId);
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
  unsigned long timestamp = millis();
  String signature = createSignature(cardId, currentOrderId, currentAmount, timestamp);
  
  DynamicJsonDocument doc(1024);
  doc["rfidCardId"] = cardId;
  doc["orderId"] = currentOrderId;
  doc["shopId"] = shopId;
  doc["totalAmount"] = currentAmount;
  doc["timestamp"] = timestamp;
  doc["signature"] = signature;
  doc["deviceId"] = deviceId;
  
  String jsonString;
  serializeJson(doc, jsonString);
  return jsonString;
}

String createSignature(String cardId, String orderId, float amount, unsigned long timestamp) {
  String data = cardId + orderId + String(amount) + String(timestamp) + deviceId;
  
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
  client.setInsecure();
  
  HTTPClient http;
  http.begin(client, serverUrl + String(rfidEndpoint));
  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "WeDine-RFID-Device");
  http.setTimeout(10000);
  
  int httpResponseCode = http.POST(paymentData);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Payment Response: " + response);
    
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
  digitalWrite(LED_GREEN, HIGH);
  delay(2000);
  digitalWrite(LED_GREEN, LOW);
  tone(BUZZER_PIN, 1000, 200);
}

void indicatePaymentModeEnabled() {
  digitalWrite(LED_BLUE, HIGH);
  tone(BUZZER_PIN, 1500, 100);
  delay(150);
  tone(BUZZER_PIN, 1500, 100);
}

void indicatePaymentModeDisabled() {
  digitalWrite(LED_BLUE, LOW);
  tone(BUZZER_PIN, 800, 200);
}

void indicateProcessing() {
  for (int i = 0; i < 6; i++) {
    digitalWrite(LED_BLUE, HIGH);
    delay(100);
    digitalWrite(LED_BLUE, LOW);
    delay(100);
  }
}

void indicateSuccess() {
  digitalWrite(LED_GREEN, HIGH);
  tone(BUZZER_PIN, 2000, 200);
  delay(300);
  tone(BUZZER_PIN, 2000, 200);
  delay(2000);
  digitalWrite(LED_GREEN, LOW);
}

void indicateError(String error) {
  digitalWrite(LED_RED, HIGH);
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
  orderActive = false;
  Serial.println("Order reset");
}
```

---

## **💳 Payment Integration with Razorpay**

### **Create Razorpay Payment API**

```typescript
// app/api/razorpay/create-payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    const { orderId, amount, shopId, deviceId } = await request.json();

    if (!orderId || !amount || !shopId) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields'
      }, { status: 400 });
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      receipt: `order_${orderId}_${Date.now()}`,
      notes: {
        orderId,
        shopId,
        deviceId,
        paymentType: 'rfid_fallback'
      }
    });

    // Store payment info in database
    const paymentRecord = {
      _type: 'razorpayPayment',
      orderId,
      amount,
      shopId,
      deviceId,
      razorpayOrderId: razorpayOrder.id,
      status: 'created',
      createdAt: new Date().toISOString()
    };

    // Save to Sanity (you'll need to implement this)
    // await writeClient.create(paymentRecord);

    return NextResponse.json({
      success: true,
      paymentId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderId: razorpayOrder.id,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('Razorpay payment creation error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create payment'
    }, { status: 500 });
  }
}
```

---

## **🏪 Shop Owner Dashboard**

### **Shop Payment Management Page**

```typescript
// app/shop/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CreditCard, Wifi, RefreshCw, DollarSign } from 'lucide-react';

interface Payment {
  _id: string;
  orderId: string;
  amount: number;
  razorpayOrderId: string;
  status: 'created' | 'paid' | 'failed';
  createdAt: string;
  paidAt?: string;
}

export default function ShopPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceStatus, setDeviceStatus] = useState<'online' | 'offline'>('offline');

  useEffect(() => {
    fetchPayments();
    checkDeviceStatus();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      // Fetch payments from your API
      const response = await fetch('/api/shop/payments');
      const data = await response.json();
      setPayments(data.payments || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const checkDeviceStatus = async () => {
    try {
      const response = await fetch('/api/rfid/device-status?deviceId=SHOP_001');
      const data = await response.json();
      setDeviceStatus(data.isOnline ? 'online' : 'offline');
    } catch (error) {
      setDeviceStatus('offline');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'created': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalEarnings = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingPayments = payments.filter(p => p.status === 'created').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Shop Payment Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              deviceStatus === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <Wifi className="h-4 w-4" />
              <span className="text-sm font-medium">
                RFID Device: {deviceStatus === 'online' ? 'Online' : 'Offline'}
              </span>
            </div>
            <Button
              onClick={checkDeviceStatus}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">₹{totalEarnings}</div>
                  <div className="text-sm text-gray-600">Total Earnings</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{pendingPayments}</div>
                  <div className="text-sm text-gray-600">Pending Payments</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Wifi className={`h-5 w-5 ${deviceStatus === 'online' ? 'text-green-600' : 'text-red-600'}`} />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {payments.filter(p => p.status === 'paid').length}
                  </div>
                  <div className="text-sm text-gray-600">Completed Payments</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Payment History</span>
              <Button onClick={fetchPayments} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <CreditCard className="h-12 w-12 text-gray-400 mb-4" />
                          <div className="text-gray-500 text-lg font-medium mb-1">No payments found</div>
                          <div className="text-gray-400 text-sm">Payments will appear here when created</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment) => (
                      <tr key={payment._id} className="hover:bg-gray-50">
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {payment.orderId}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{payment.amount}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          <Badge className={getStatusColor(payment.status)}>
                            {payment.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(payment.createdAt)}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.status === 'created' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                // Open Razorpay payment
                                window.open(`/payment/razorpay/${payment.razorpayOrderId}`, '_blank');
                              }}
                            >
                              Pay Now
                            </Button>
                          )}
                          {payment.status === 'paid' && (
                            <span className="text-green-600 text-sm">✓ Paid</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## **🔄 Complete Workflow**

### **1. Student Setup:**
1. Student visits `/rfid-finder`
2. Gets RFID serial number (NFC or manual)
3. Admin registers card in `/admin/rfid`
4. Student adds money to wallet

### **2. Order Processing:**
1. Student places order
2. Order appears in admin panel
3. Admin sets order on RFID device
4. Student taps RFID card for payment

### **3. Payment Options:**
1. **RFID Payment**: Automatic wallet deduction
2. **Razorpay Fallback**: If RFID fails, create Razorpay payment
3. **Shop Dashboard**: Monitor all payments

### **4. Shop Owner Benefits:**
1. **Real-time Monitoring**: See all payments instantly
2. **Device Status**: Know if RFID device is online
3. **Payment History**: Track all transactions
4. **Earnings Dashboard**: Monitor shop performance

---

## **🚀 Quick Start Checklist**

- [ ] Upload Arduino code to ESP8266
- [ ] Update WiFi credentials in Arduino code
- [ ] Update server URL in Arduino code
- [ ] Set up Vercel environment variables
- [ ] Deploy to Vercel
- [ ] Test RFID detection
- [ ] Register test RFID cards
- [ ] Test payment processing
- [ ] Set up shop dashboard
- [ ] Go live! 🎉

---

**🎉 Your complete RFID payment system is ready! Students can pay with their college ID cards, and shop owners can monitor everything in real-time.**
