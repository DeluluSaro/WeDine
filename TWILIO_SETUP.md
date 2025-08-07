# Twilio SMS Setup Guide for WeDine

## Overview
This guide helps you set up Twilio SMS notifications for stock alerts in the WeDine application.

## Prerequisites
1. Twilio account (sign up at https://www.twilio.com)
2. Verified phone number in Twilio
3. Account SID and Auth Token from Twilio Console

## Step 1: Get Twilio Credentials

### 1.1 Get Account SID and Auth Token
1. Log in to your Twilio Console: https://console.twilio.com/
2. Go to Dashboard
3. Copy your **Account SID** and **Auth Token**

### 1.2 Get a Twilio Phone Number
1. In Twilio Console, go to **Phone Numbers** → **Manage** → **Active numbers**
2. Click **Get a trial number** (free for testing)
3. Copy the phone number (format: +1XXXXXXXXXX)

## Step 2: Environment Variables Setup

### 2.1 Local Development (.env.local)
Add these to your `.env.local` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
```

### 2.2 Vercel Deployment
1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - `TWILIO_ACCOUNT_SID` = Your Account SID
   - `TWILIO_AUTH_TOKEN` = Your Auth Token
   - `TWILIO_PHONE_NUMBER` = Your Twilio phone number

## Step 3: Test Configuration

### 3.1 Test Environment Variables
```bash
# Test if environment variables are set
curl -X POST http://localhost:3000/api/test-twilio
```

### 3.2 Test SMS Sending
```bash
# Test SMS sending (replace with your mobile number)
curl -X POST http://localhost:3000/api/test-twilio \
  -H "Content-Type: application/json" \
  -d '{"testMobile": "+918754502573"}'
```

## Step 4: Mobile Number Format

### 4.1 For SMS Notifications
- **Format**: `+918754502573` (no hyphen)
- **Validation**: Must match `/^\+91[0-9]{10}$/`

### 4.2 For Payment Transfers
- **Format**: `+918754502573` (no hyphen)
- **Used in**: Razorpay payment transfers

### 4.3 For Sanity CMS
- **SMS Contact**: `+91-8754502573` (with hyphen)
- **Payment Contact**: `+918754502573` (no hyphen)

## Step 5: Troubleshooting

### 5.1 Common Issues

#### Issue: "Missing Twilio environment variables"
**Solution**: Set all three environment variables:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

#### Issue: "Invalid mobile number format"
**Solution**: Ensure mobile number is in format `+918754502573` (no hyphen)

#### Issue: "Authentication failed"
**Solution**: Check your Account SID and Auth Token are correct

#### Issue: "Phone number not verified"
**Solution**: Verify your Twilio phone number in the Twilio Console

### 5.2 Debug Commands

```bash
# Check environment variables
curl -X POST http://localhost:3000/api/test-twilio

# Test SMS with your number
curl -X POST http://localhost:3000/api/test-twilio \
  -H "Content-Type: application/json" \
  -d '{"testMobile": "+918754502573"}'

# Test notifications API
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "foodItem": {
      "foodName": "Test Pizza",
      "shopRef": {
        "shopName": "Test Shop",
        "paymentMobile": "+918754502573"
      }
    }
  }'
```

## Step 6: Production Considerations

### 6.1 Security
- Never commit environment variables to git
- Use Vercel's environment variable management
- Rotate Auth Token regularly

### 6.2 Cost Management
- Twilio trial accounts have limited SMS
- Monitor usage in Twilio Console
- Set up billing alerts

### 6.3 Error Handling
- SMS failures are logged
- Graceful fallback when SMS fails
- User-friendly error messages

## Step 7: Verification

### 7.1 Test Complete Flow
1. Set item quantity to 0 in Sanity Studio
2. View item on booking page
3. Click "Send SMS Alert" button
4. Check console logs for SMS status
5. Verify SMS received on mobile

### 7.2 Expected Console Output
```
=== API NOTIFICATION REQUEST ===
🔧 Twilio Configuration Check:
- Account SID: ✅ Set
- Auth Token: ✅ Set
- Phone Number: ✅ Set
📱 Sending SMS to: +918754502573
✅ SMS sent successfully! SID: SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
✅ Notifications sent successfully
```

## Support

If you encounter issues:
1. Check console logs for detailed error messages
2. Verify environment variables are set correctly
3. Test with the provided test endpoints
4. Check Twilio Console for account status and usage

## Files Modified
- `lib/notifications.ts` - Enhanced error handling
- `app/api/notifications/route.ts` - Better logging
- `app/api/test-twilio/route.ts` - Test endpoint
- `sanity/schemaTypes/ShopName.ts` - Added paymentMobile field
- `sanity/schemaTypes/shopType.ts` - Added paymentMobile field 