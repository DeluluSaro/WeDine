/*
 * WeDine RFID Payment System Configuration
 * ESP8266 + RC522 RFID Module
 */

#ifndef CONFIG_H
#define CONFIG_H

// WiFi Configuration
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Backend Configuration
#define SERVER_URL "https://your-domain.com"
#define RFID_ENDPOINT "/api/payment/rfid"
#define STATUS_ENDPOINT "/api/payment/rfid/status"

// Security Configuration
#define RFID_SECRET_KEY "YOUR_RFID_SECRET_KEY"
#define DEVICE_ID "SHOP_001"

// Hardware Pin Configuration
#define RST_PIN D1
#define SS_PIN D2
#define BUZZER_PIN D3
#define LED_GREEN D4
#define LED_RED D5
#define LED_BLUE D6
#define BUTTON_PIN D7

// Timing Configuration
#define CARD_READ_DELAY 2000        // 2 seconds between card reads
#define PAYMENT_TIMEOUT 300000      // 5 minutes payment timeout
#define WIFI_RECONNECT_DELAY 1000   // 1 second between reconnection attempts
#define STATUS_CHECK_INTERVAL 30000 // 30 seconds between status checks

// Security Settings
#define MAX_PAYMENT_AMOUNT 1000.0   // Maximum payment amount in INR
#define SIGNATURE_TIMEOUT 300000    // 5 minutes signature validity

// LED Patterns
#define LED_BLINK_FAST 100
#define LED_BLINK_SLOW 500
#define LED_BLINK_COUNT 3

// Buzzer Configuration
#define BUZZER_FREQ_SUCCESS 2000
#define BUZZER_FREQ_ERROR 500
#define BUZZER_FREQ_WARNING 1000
#define BUZZER_DURATION_SHORT 100
#define BUZZER_DURATION_LONG 500

// Debug Configuration
#define DEBUG_MODE true
#define SERIAL_BAUD_RATE 115200

// RFID Card Configuration
#define MAX_CARD_ID_LENGTH 16
#define CARD_READ_TIMEOUT 5000

// Network Configuration
#define HTTP_TIMEOUT 10000
#define MAX_RETRY_ATTEMPTS 3

#endif // CONFIG_H
