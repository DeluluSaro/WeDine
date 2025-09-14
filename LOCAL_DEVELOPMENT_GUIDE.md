# WeDine RFID System - Local Development Guide

## 🏠 Complete Local Setup Instructions

### Prerequisites
- **Node.js** (v18 or higher)
- **Arduino IDE**
- **Git** (for cloning the repository)
- **WiFi Network** (for ESP8266 connection)

---

## 📦 Hardware Requirements

### Essential Components
1. **ESP8266 Development Board**
   - NodeMCU v1.0 (recommended)
   - Wemos D1 Mini (alternative)
   - Any ESP8266-based board

2. **RC522 RFID Module**
   - 13.56MHz RFID reader/writer
   - Comes with antenna and card

3. **RFID Cards/Tags**
   - MIFARE Classic 1K cards (recommended)
   - Any 13.56MHz compatible cards
   - College ID cards (if compatible)

4. **Jumper Wires**
   - Male-to-Male wires (7 pieces)
   - Breadboard (optional but recommended)

5. **Power Supply**
   - USB cable for ESP8266
   - 5V power adapter (optional)

6. **LED (Optional)**
   - Any LED for visual feedback
   - 220Ω resistor

### Total Cost: ~$15-25 USD

---

## 🔌 Hardware Wiring Diagram

```
RC522 RFID Module    ESP8266 (NodeMCU)
┌─────────────┐      ┌─────────────┐
│ VCC         │─────▶│ 3.3V        │
│ GND         │─────▶│ GND         │
│ RST         │─────▶│ D1 (GPIO5)  │
│ MISO        │─────▶│ D6 (GPIO12) │
│ MOSI        │─────▶│ D7 (GPIO13) │
│ SCK         │─────▶│ D5 (GPIO14) │
│ SDA (SS)    │─────▶│ D2 (GPIO4)  │
└─────────────┘      └─────────────┘

LED (Optional)
┌─────────┐
│ + (Anode)│─────▶│ D4 (GPIO2) │
│ - (Cathode)│─────▶│ GND       │
└─────────┘
```

### Pin Mapping Reference
| RC522 Pin | ESP8266 Pin | GPIO | Function |
|-----------|-------------|------|----------|
| VCC       | 3.3V        | -    | Power    |
| GND       | GND         | -    | Ground   |
| RST       | D1          | GPIO5| Reset    |
| MISO      | D6          | GPIO12| Data Out |
| MOSI      | D7          | GPIO13| Data In  |
| SCK       | D5          | GPIO14| Clock    |
| SDA       | D2          | GPIO4 | Chip Select |

---

## 💻 Software Setup

### Step 1: Install Arduino IDE
1. Download from: https://www.arduino.cc/en/software
2. Install the software
3. Open Arduino IDE

### Step 2: Install ESP8266 Board Package
1. Go to **File → Preferences**
2. Add this URL to "Additional Board Manager URLs":
   ```
   http://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
3. Go to **Tools → Board → Boards Manager**
4. Search for "ESP8266" and install it

### Step 3: Install Required Libraries
Install these libraries in Arduino IDE:

1. **MFRC522 Library**
   - Go to **Tools → Manage Libraries**
   - Search for "MFRC522"
   - Install by "Miguel Balboa"

2. **ArduinoJson Library**
   - Search for "ArduinoJson"
   - Install by "Benoit Blanchon"

3. **ESP8266WiFi Library** (usually pre-installed)

### Step 4: Configure Arduino Code
1. Open `iot/simple_rfid_reader.ino`
2. Update these settings:

```cpp
// WiFi credentials - UPDATE THESE
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";

// Server configuration - KEEP THESE FOR LOCAL
const char* localServerUrl = "http://localhost:3000";
const char* productionServerUrl = "https://your-app.vercel.app";
bool useProduction = false; // Keep false for local development
```

### Step 5: Upload Arduino Code
1. Select Board: **Tools → Board → ESP8266 Boards → NodeMCU 1.0**
2. Select Port: **Tools → Port → (your COM port)**
3. Click **Upload** button
4. Open **Serial Monitor** (Tools → Serial Monitor)
5. Set baud rate to **115200**

---

## 🖥️ Local Server Setup

### Step 1: Install Dependencies
```bash
# Navigate to your project directory
cd wedine

# Install all dependencies
npm install
```

### Step 2: Set Up Environment Variables
Create a `.env.local` file in your project root:

```bash
# Sanity Configuration
NEXT_PUBLIC_SANITY_PROJECT_ID=your_sanity_project_id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=your_sanity_api_token

# Razorpay Configuration
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# RFID Security Keys (generate using the script)
RFID_SECRET_KEY=your_generated_secret_key
ADMIN_RFID_KEY=your_generated_admin_key
NEXT_PUBLIC_ADMIN_RFID_KEY=your_generated_public_key
```

### Step 3: Generate RFID Keys
```bash
# Run the key generation script
node scripts/generate-rfid-keys.js
```

### Step 4: Start the Development Server
```bash
# Start the Next.js development server
npm run dev
```

Your server will be available at: **http://localhost:3000**

---

## 🧪 Testing Your Setup

### Step 1: Test Arduino Connection
1. Power on your ESP8266
2. Check Serial Monitor for:
   ```
   WeDine RFID Reader Starting...
   WiFi connected!
   IP address: 192.168.1.100
   RFID Reader Ready!
   Environment: DEVELOPMENT
   Server URL: http://localhost:3000
   Place a card near the reader...
   ```

### Step 2: Test RFID Card Detection
1. Place an RFID card near the reader
2. You should see in Serial Monitor:
   ```
   Card detected: A1B2C3D4
   Sending to server: {"rfidCardId":"A1B2C3D4",...}
   Server response: {"success":true,...}
   ✅ Card ID sent successfully!
   ```

### Step 3: Test Web Application
1. Open **http://localhost:3000** in your browser
2. Go to **Admin Page**: http://localhost:3000/admin
3. Enable **RFID Payment** mode
4. Test the RFID input functionality

### Step 4: Test Complete Payment Flow
1. **Register RFID Card**:
   - Go to **Wallet Page**: http://localhost:3000/wallet
   - Click **Setup RFID Card**
   - Enter the card ID from Serial Monitor
   - Click **Register Card**

2. **Process Payment**:
   - Go to **Admin Page**: http://localhost:3000/admin
   - Enable **RFID Payment**
   - Select an unpaid order
   - Enter the RFID card ID
   - Click **Pay Now**

---

## 🔧 Troubleshooting

### Arduino Issues

#### No Card Detection
- **Check wiring** - Ensure all connections are secure
- **Check power** - Make sure ESP8266 is powered on
- **Check distance** - Card should be 1-2cm from reader
- **Try different cards** - Some cards may not be compatible

#### WiFi Connection Failed
- **Check credentials** - Verify WiFi name and password
- **Check signal** - Move closer to router
- **Check frequency** - Use 2.4GHz WiFi (not 5GHz)
- **Check Serial Monitor** - Look for error messages

#### Server Connection Failed
- **Check local server** - Make sure `npm run dev` is running
- **Check URL** - Verify `useProduction = false`
- **Check firewall** - Disable Windows Firewall temporarily
- **Check port** - Ensure port 3000 is not blocked

### Web Application Issues

#### Page Not Loading
- **Check server** - Ensure `npm run dev` is running
- **Check port** - Verify http://localhost:3000 is accessible
- **Check dependencies** - Run `npm install` again
- **Check console** - Look for error messages in browser console

#### RFID Input Not Working
- **Check admin mode** - Ensure RFID mode is enabled
- **Check order selection** - Select an unpaid order first
- **Check card ID** - Verify the card ID is correct
- **Check API** - Test API endpoints manually

---

## 📱 Mobile Testing

### Test on Mobile Device
1. **Connect to same WiFi** - Your mobile device and ESP8266
2. **Find your computer's IP** - Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. **Access from mobile** - Go to `http://YOUR_IP:3000` on mobile
4. **Test NFC** - Use mobile NFC to detect RFID cards

### Mobile NFC Setup
1. **Enable NFC** - Turn on NFC in your phone settings
2. **Open RFID Finder** - Go to `/rfid-finder` page
3. **Grant permissions** - Allow NFC access when prompted
4. **Test detection** - Place card near phone's NFC area

---

## 🎯 Complete Workflow

### Daily Usage
1. **Start Arduino** - Power on ESP8266
2. **Start Server** - Run `npm run dev`
3. **Open Admin** - Go to http://localhost:3000/admin
4. **Enable RFID** - Click "Enable RFID Payment"
5. **Process Payments**:
   - Place RFID card near reader
   - Copy card ID from Serial Monitor
   - Paste in admin RFID input
   - Select order and pay

### Student Setup
1. **Find Card ID** - Use RFID Finder page or ask admin
2. **Register Card** - Go to Wallet page and register
3. **Add Money** - Add money to wallet
4. **Ready to Pay** - Use RFID for payments

---

## 🚀 Next Steps

Once your local setup is working perfectly:

1. **Test thoroughly** - Test all features multiple times
2. **Document issues** - Note any problems and solutions
3. **Prepare for deployment** - Follow the Vercel deployment guide
4. **Scale up** - Add more RFID readers if needed

---

## 📞 Support

### Common Solutions
- **Restart everything** - Arduino, server, and browser
- **Check connections** - All wires should be secure
- **Update libraries** - Keep Arduino libraries updated
- **Clear cache** - Clear browser cache if issues persist

### Getting Help
- Check Serial Monitor for error messages
- Check browser console for JavaScript errors
- Verify all environment variables are set
- Test each component individually

---

## 🎉 Success!

If everything is working, you should have:
- ✅ ESP8266 reading RFID cards
- ✅ Card IDs appearing in Serial Monitor
- ✅ Web application running on localhost:3000
- ✅ Admin page processing RFID payments
- ✅ Students able to register their cards
- ✅ Complete payment flow working

**Congratulations! Your local RFID payment system is ready! 🎉**
