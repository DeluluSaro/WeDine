# Firebase RFID System Setup Guide

This guide will help you set up the new Firebase-based RFID system for WeDine.

## Prerequisites

1. Firebase project with Realtime Database enabled
2. EmailJS account for OTP sending
3. Existing WeDine project setup

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Enable Realtime Database
4. Set up security rules for Realtime Database:

```json
{
  "rules": {
    "shops": {
      ".read": true,
      ".write": true
    }
  }
}
```

### 2. Get Firebase Configuration

1. Go to Project Settings > General
2. Scroll down to "Your apps" section
3. Add a web app if not already added
4. Copy the Firebase configuration

### 3. Environment Variables

Add these environment variables to your `.env.local` file:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# EmailJS Configuration
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_emailjs_service_id
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_emailjs_template_id
```

## EmailJS Setup

### 1. Create EmailJS Account

1. Go to [EmailJS](https://www.emailjs.com/)
2. Sign up for a free account
3. Create a new service (Gmail, Outlook, etc.)

### 2. Create Email Template

1. Go to Email Templates
2. Create a new template for OTP verification
3. Use this template content:

```
Subject: WeDine RFID Registration OTP

Hello,

Your OTP for RFID card registration is: {{otp}}

RFID Card ID: {{rfid_card_id}}

This OTP is valid for 5 minutes.

Best regards,
WeDine Team
```

### 3. Get EmailJS Configuration

1. Go to Account > API Keys
2. Copy your Public Key
3. Go to Email Templates and copy Service ID and Template ID

## System Features

### 1. Shop Creation
- When a shop is created in Sanity, it automatically creates a Firebase database structure
- Each shop gets its own `/shops/{shopName}` path in Firebase

### 2. RFID Registration with OTP
- Users must register their RFID card in the wallet
- OTP is sent to their email for verification
- Only verified RFID cards can be used for payments

### 3. Real-time RFID Monitoring
- Admin page shows real-time RFID data from Firebase
- RFID cards are captured and stored in Firebase when scanned
- Payment verification checks against Firebase data

### 4. Payment Processing
- RFID payments are verified against Firebase data
- Money is deducted from user's wallet
- Payment is transferred to shop owner's account

## API Endpoints

### RFID Registration
- `POST /api/rfid/register` - Send OTP for RFID registration
- `PUT /api/rfid/register` - Verify OTP and register RFID card

### RFID Data Management
- `POST /api/rfid/capture` - Capture and store RFID data
- `GET /api/rfid/data` - Get RFID data for a shop

### Payment Processing
- `POST /api/payment/verify-rfid` - Verify and process RFID payment

### Shop Management
- `POST /api/shops/create` - Create shop and Firebase structure
- `GET /api/shops` - Get all shops

## Usage Flow

### For Users (Wallet Page)
1. Go to wallet page
2. Click "Setup RFID Card"
3. Enter student name and RFID card ID
4. Receive OTP via email
5. Enter OTP to complete registration

### For Admins (Admin Page)
1. Enable RFID mode
2. Start listening to Firebase data
3. Select an order to pay
4. Use RFID card ID from real-time data or manual input
5. Process payment

### For RFID Devices
1. RFID device scans card
2. Card ID is sent to `/api/rfid/capture`
3. Data is stored in Firebase under shop name
4. Admin page shows real-time updates

## Testing

### 1. Test RFID Registration
1. Go to wallet page
2. Try registering with a test RFID card ID
3. Check email for OTP
4. Complete registration

### 2. Test Payment Processing
1. Create a test order
2. Go to admin page
3. Enable RFID mode
4. Process payment with registered RFID card

### 3. Test Real-time Data
1. Use the RFID reader page to monitor data
2. Scan RFID cards and see real-time updates
3. Verify data appears in admin page

## Troubleshooting

### Common Issues

1. **Firebase connection failed**
   - Check environment variables
   - Verify Firebase project configuration
   - Check Realtime Database rules

2. **OTP not received**
   - Check EmailJS configuration
   - Verify email template
   - Check spam folder

3. **RFID data not showing**
   - Check Firebase database structure
   - Verify shop name matches
   - Check API endpoints

4. **Payment verification failed**
   - Ensure RFID card is registered
   - Check wallet balance
   - Verify Firebase data

## Security Considerations

1. Firebase rules should restrict access appropriately
2. OTP should have expiration time
3. RFID cards should be verified before payment
4. Admin access should be properly authenticated

## Support

For issues or questions:
1. Check the console for error messages
2. Verify all environment variables are set
3. Test each component individually
4. Check Firebase and EmailJS dashboards for errors
