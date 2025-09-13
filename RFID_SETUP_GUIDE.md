# WeDine RFID Payment System Setup Guide

## Overview
This guide will help you set up the complete RFID-based payment system for WeDine, including hardware setup, software configuration, and security implementation.

## Hardware Requirements

### ESP8266 Development Board
- NodeMCU or Wemos D1 Mini
- Built-in WiFi capability
- 3.3V and 5V power supply

### RC522 RFID Module
- Operating voltage: 3.3V
- Communication: SPI
- Read distance: 0-6cm

### Additional Components
- Buzzer (5V)
- LEDs (Green, Red, Blue)
- Push button
- Resistors (220Ω for LEDs)
- Breadboard and jumper wires

## Hardware Connections

```
RC522 Module    ESP8266
VCC         ->  3.3V
GND         ->  GND
RST         ->  D1 (GPIO5)
SS/SDA      ->  D2 (GPIO4)
MOSI        ->  D7 (GPIO13)
MISO        ->  D6 (GPIO12)
SCK         ->  D5 (GPIO14)

Buzzer      ->  D3 (GPIO0)
LED Green   ->  D4 (GPIO2)
LED Red     ->  D5 (GPIO14)
LED Blue    ->  D6 (GPIO12)
Button      ->  D7 (GPIO13)
```

## Software Setup

### 1. Arduino IDE Configuration
1. Install Arduino IDE
2. Add ESP8266 board support:
   - Go to File > Preferences
   - Add this URL to Additional Board Manager URLs:
     `http://arduino.esp8266.com/stable/package_esp8266com_index.json`
3. Install ESP8266 board package
4. Install required libraries:
   - MFRC522 (by Miguel Balboa)
   - ArduinoJson (by Benoit Blanchon)
   - ESP8266HTTPClient (included with ESP8266 core)

### 2. Code Configuration
1. Open `esp8266_rfid_payment.ino` in Arduino IDE
2. Update configuration in the code:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   const char* serverUrl = "https://your-domain.com";
   const char* secretKey = "YOUR_RFID_SECRET_KEY";
   ```

### 3. Backend Configuration
1. Set up environment variables:
   ```env
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   RFID_SECRET_KEY=your_rfid_secret_key
   ADMIN_RFID_KEY=your_admin_key
   ```

2. Update RFID card mappings in `/api/payment/rfid/route.ts`:
   ```typescript
   const RFID_CARD_MAPPINGS: Record<string, string> = {
     'A1B2C3D4': 'student1@vitstudent.ac.in',
     'E5F6G7H8': 'student2@vitstudent.ac.in',
     // Add more mappings
   };
   ```

## Security Implementation

### 1. RFID Card Registration
- Each RFID card must be registered with a user email
- Cards are mapped to user emails in the backend
- Unregistered cards are rejected

### 2. Payment Security
- All payment requests are signed with HMAC
- Timestamp validation prevents replay attacks
- Device authentication using secret keys
- SSL/TLS encryption for all communications

### 3. Wallet Security
- Balance validation before payment
- Transaction logging for audit trail
- Razorpay integration for secure money addition
- Signature verification for all transactions

## Testing the System

### 1. Hardware Test
1. Upload the code to ESP8266
2. Open Serial Monitor (115200 baud)
3. Check WiFi connection status
4. Test RFID card reading
5. Verify LED and buzzer responses

### 2. Backend Test
1. Test wallet creation API
2. Test Razorpay integration
3. Test RFID payment API
4. Verify transaction logging

### 3. End-to-End Test
1. Create a test order
2. Enable RFID payment mode
3. Scan RFID card
4. Verify payment completion
5. Check wallet balance update

## Troubleshooting

### Common Issues

#### WiFi Connection Problems
- Check SSID and password
- Verify WiFi signal strength
- Check firewall settings

#### RFID Reading Issues
- Verify wiring connections
- Check power supply (3.3V)
- Test with different RFID cards
- Adjust read distance

#### Payment Failures
- Check wallet balance
- Verify RFID card registration
- Check network connectivity
- Review server logs

#### Device Not Responding
- Check power supply
- Verify code upload
- Check serial monitor for errors
- Reset device

### Debug Mode
Enable debug mode in the code for detailed logging:
```cpp
#define DEBUG_MODE true
```

## Production Deployment

### 1. Security Checklist
- [ ] Change default passwords
- [ ] Use strong secret keys
- [ ] Enable SSL/TLS
- [ ] Implement rate limiting
- [ ] Set up monitoring
- [ ] Regular security audits

### 2. Hardware Considerations
- Use proper enclosures
- Implement power backup
- Regular maintenance schedule
- Spare device availability

### 3. Network Setup
- Dedicated WiFi network
- Network segmentation
- Firewall configuration
- VPN for remote management

## Maintenance

### Regular Tasks
1. Check device connectivity
2. Monitor payment logs
3. Update RFID card mappings
4. Backup transaction data
5. Security updates

### Monthly Tasks
1. Review security logs
2. Update device firmware
3. Test backup systems
4. Performance optimization
5. User feedback review

## Support

For technical support:
- Check the troubleshooting section
- Review server logs
- Contact system administrator
- Submit bug reports with detailed information

## Version History
- v1.0: Initial implementation
- v1.1: Added security enhancements
- v1.2: Improved error handling
- v1.3: Added device status monitoring
