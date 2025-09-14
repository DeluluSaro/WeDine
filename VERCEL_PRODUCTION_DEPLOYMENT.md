# WeDine RFID System - Vercel Production Deployment Guide

## 🚀 Complete Production Deployment Instructions

### Prerequisites
- **Working local setup** (follow LOCAL_DEVELOPMENT_GUIDE.md first)
- **Vercel account** (free tier available)
- **Domain name** (optional, Vercel provides free subdomain)
- **Production WiFi** (for ESP8266 in production environment)

---

## 🏗️ System Architecture

### Production Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ESP8266       │    │   Vercel        │    │   Sanity.io     │
│   RFID Reader   │───▶│   Next.js App   │───▶│   Database      │
│   (Hardware)    │    │   (Backend)     │    │   (Data)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Admin Panel   │    │   Razorpay      │    │   Shop Dashboard│
│   (Web UI)      │    │   (Payments)    │    │   (Analytics)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow
1. **RFID Detection** → ESP8266 reads card
2. **Data Transmission** → ESP8266 sends to Vercel
3. **Payment Processing** → Vercel processes payment
4. **Database Update** → Sanity stores transaction
5. **Money Transfer** → Razorpay handles transfers
6. **Confirmation** → All parties get confirmation

---

## 📦 Production Hardware Requirements

### Essential Components (Same as Local)
1. **ESP8266 Development Board** - NodeMCU v1.0 (recommended)
2. **RC522 RFID Module** - 13.56MHz RFID reader
3. **RFID Cards/Tags** - MIFARE Classic 1K cards
4. **Jumper Wires** - 7 pieces for connections
5. **Power Supply** - 5V adapter or USB power
6. **LED** - For visual feedback (optional)
7. **Enclosure** - Protective case (recommended)

### Production Considerations
- **Power Backup** - UPS for continuous operation
- **Network Stability** - Reliable WiFi connection
- **Physical Security** - Secure mounting of hardware
- **Environmental Protection** - Dust and moisture protection

---

## 🔧 Hardware Wiring (Production)

### Same Wiring as Local Development
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
```

### Production Wiring Tips
- **Use breadboard** - For easy maintenance
- **Secure connections** - Use wire connectors
- **Label wires** - For easy troubleshooting
- **Test thoroughly** - Before final installation

---

## 💻 Software Configuration for Production

### Step 1: Update Arduino Code for Production
Edit `iot/simple_rfid_reader.ino`:

```cpp
// WiFi credentials for production environment
const char* ssid = "YOUR_PRODUCTION_WIFI_NAME";
const char* password = "YOUR_PRODUCTION_WIFI_PASSWORD";

// Server configuration
const char* localServerUrl = "http://localhost:3000";
const char* productionServerUrl = "https://your-app-name.vercel.app"; // Your actual Vercel URL
bool useProduction = true; // Set to true for production
```

### Step 2: Install Vercel CLI
```bash
# Install Vercel CLI globally
npm install -g vercel

# Verify installation
vercel --version
```

### Step 3: Deploy to Vercel
```bash
# Navigate to your project directory
cd wedine

# Login to Vercel
vercel login

# Deploy your project
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No
# - What's your project's name? wedine-rfid
# - In which directory is your code located? ./
# - Want to override the settings? No
```

### Step 4: Set Environment Variables
```bash
# Set each environment variable in Vercel
vercel env add RFID_SECRET_KEY
# Enter your generated secret key

vercel env add ADMIN_RFID_KEY
# Enter your generated admin key

vercel env add NEXT_PUBLIC_ADMIN_RFID_KEY
# Enter your generated public key

vercel env add NEXT_PUBLIC_RAZORPAY_KEY_ID
# Enter your Razorpay key ID

vercel env add RAZORPAY_KEY_SECRET
# Enter your Razorpay key secret

vercel env add NEXT_PUBLIC_SANITY_PROJECT_ID
# Enter your Sanity project ID

vercel env add NEXT_PUBLIC_SANITY_DATASET
# Enter: production

vercel env add SANITY_API_TOKEN
# Enter your Sanity API token
```

### Step 5: Redeploy with Environment Variables
```bash
# Redeploy to apply environment variables
vercel --prod
```

---

## 🔐 Security Configuration

### Step 1: Generate Secure Keys
```bash
# Run the key generation script
node scripts/generate-rfid-keys.js

# Copy the generated keys to Vercel environment variables
```

### Step 2: Configure Razorpay
1. **Create Razorpay Account** - https://razorpay.com
2. **Get API Keys** - From Razorpay dashboard
3. **Set Webhook** - Configure webhook URL
4. **Test Payments** - Verify payment processing

### Step 3: Configure Sanity
1. **Create Sanity Project** - https://sanity.io
2. **Get API Token** - With write permissions
3. **Configure CORS** - Add your Vercel domain
4. **Test Connection** - Verify data flow

---

## 🌐 Domain Configuration

### Step 1: Get Your Vercel URL
After deployment, you'll get a URL like:
```
https://wedine-rfid-abc123.vercel.app
```

### Step 2: Update Arduino Code
Update the `productionServerUrl` in your Arduino code:
```cpp
const char* productionServerUrl = "https://wedine-rfid-abc123.vercel.app";
```

### Step 3: Custom Domain (Optional)
1. **Buy Domain** - From any domain registrar
2. **Add to Vercel** - Go to Project Settings → Domains
3. **Configure DNS** - Point domain to Vercel
4. **Update Arduino** - Use your custom domain

---

## 🧪 Production Testing

### Step 1: Test API Endpoints
```bash
# Test RFID card detection
curl -X POST https://your-app.vercel.app/api/rfid/card-detected \
  -H "Content-Type: application/json" \
  -d '{"rfidCardId":"TEST123","action":"card_detected"}'

# Test fast payment
curl -X POST https://your-app.vercel.app/api/rfid/fast-payment \
  -H "Content-Type: application/json" \
  -d '{"rfidCardId":"TEST123","orderId":"order123","totalAmount":100,"adminKey":"your_admin_key"}'
```

### Step 2: Test Web Application
1. **Admin Page** - https://your-app.vercel.app/admin
2. **RFID Finder** - https://your-app.vercel.app/rfid-finder
3. **Shop Dashboard** - https://your-app.vercel.app/shop
4. **Wallet Page** - https://your-app.vercel.app/wallet

### Step 3: Test Complete Flow
1. **Register RFID Card** - Use wallet page
2. **Process Payment** - Use admin page
3. **Verify Transaction** - Check Sanity database
4. **Check Razorpay** - Verify money transfer

---

## 📱 Mobile Configuration

### Step 1: Test Mobile Access
1. **Connect to WiFi** - Same network as ESP8266
2. **Open App** - Go to your Vercel URL on mobile
3. **Test NFC** - Use mobile NFC for card detection
4. **Test Responsiveness** - Ensure mobile-friendly UI

### Step 2: PWA Configuration
1. **Add PWA Manifest** - For app-like experience
2. **Enable Service Worker** - For offline functionality
3. **Test Installation** - Install as mobile app

---

## 🔧 Production Monitoring

### Step 1: Vercel Analytics
1. **Enable Analytics** - In Vercel dashboard
2. **Monitor Performance** - Track page load times
3. **Set Up Alerts** - For errors and downtime

### Step 2: Error Monitoring
1. **Check Logs** - Vercel function logs
2. **Monitor API Usage** - Track endpoint calls
3. **Set Up Alerts** - For payment failures

### Step 3: Performance Monitoring
1. **Track Response Times** - API performance
2. **Monitor Database** - Sanity query performance
3. **Check Uptime** - System availability

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Local setup working perfectly
- [ ] All tests passing
- [ ] Environment variables ready
- [ ] Arduino code updated
- [ ] Hardware tested

### Deployment
- [ ] Vercel CLI installed
- [ ] Project deployed to Vercel
- [ ] Environment variables set
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active

### Post-Deployment
- [ ] All endpoints working
- [ ] Mobile access working
- [ ] RFID detection working
- [ ] Payment processing working
- [ ] Database connection working

---

## 🔄 Maintenance

### Daily Tasks
- [ ] Check system status
- [ ] Monitor payment success rate
- [ ] Check for errors in logs
- [ ] Verify hardware connectivity

### Weekly Tasks
- [ ] Review performance metrics
- [ ] Check for security updates
- [ ] Backup important data
- [ ] Test all features

### Monthly Tasks
- [ ] Update dependencies
- [ ] Review security settings
- [ ] Analyze usage patterns
- [ ] Plan improvements

---

## 🆘 Troubleshooting

### Common Issues

#### Arduino Can't Connect to Vercel
- **Check URL** - Verify Vercel URL is correct
- **Check HTTPS** - Ensure SSL is working
- **Check WiFi** - Verify internet connection
- **Check Firewall** - Ensure ports are open

#### Environment Variables Not Working
- **Redeploy** - After adding environment variables
- **Check Names** - Ensure exact variable names
- **Check Values** - Verify no extra spaces
- **Check Dashboard** - Verify in Vercel dashboard

#### Payment Processing Fails
- **Check Razorpay** - Verify API keys
- **Check Sanity** - Verify database connection
- **Check Logs** - Look for error messages
- **Test Manually** - Use curl commands

---

## 📊 Production URLs

After successful deployment, you'll have:

- **Main App**: `https://your-app.vercel.app`
- **Admin Dashboard**: `https://your-app.vercel.app/admin`
- **RFID Finder**: `https://your-app.vercel.app/rfid-finder`
- **Shop Dashboard**: `https://your-app.vercel.app/shop`
- **Wallet Page**: `https://your-app.vercel.app/wallet`

---

## 🎉 Success!

If everything is working, you should have:
- ✅ ESP8266 connecting to Vercel
- ✅ RFID payments processing
- ✅ Mobile app working
- ✅ Admin dashboard functional
- ✅ Shop owners receiving payments
- ✅ Students able to pay with RFID

**Congratulations! Your production RFID payment system is live! 🚀**

---

## 📞 Support

### Getting Help
- Check Vercel logs for errors
- Monitor Sanity for data issues
- Test each component individually
- Use browser developer tools

### Scaling Up
- Add more RFID readers
- Implement load balancing
- Add more payment methods
- Expand to multiple locations

**Your WeDine RFID system is now production-ready! 🎉**
