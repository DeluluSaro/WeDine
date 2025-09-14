# Email Verification Debug Guide

## Quick Test Steps

### 1. Test Environment Variables
Visit: `http://localhost:3000/api/email/test`

This will show you if your environment variables are configured correctly.

### 2. Test Simple Email Service
The system now has a fallback that works without external APIs. When you try to register an RFID card:

1. Go to `/wallet` page
2. Enter RFID card ID and student name
3. Click "Send Verification Email"
4. Check the browser console for the verification URL
5. Copy and paste the URL in a new tab to complete verification

### 3. Check Console Logs
Open browser developer tools (F12) and check the Console tab for detailed logs.

## Common Issues & Solutions

### Issue 1: "Email service not configured"
**Solution:** Add to `.env.local`:
```bash
RESEND_API_KEY=your_resend_api_key_here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Issue 2: "Failed to send verification email"
**Solution:** The system will automatically fall back to the simple service and show the verification URL in the console.

### Issue 3: Resend API errors
**Common causes:**
- Invalid API key
- Unverified domain
- Rate limiting
- Invalid email format

**Solution:** Use the fallback service (it will work automatically)

## How to Get Resend API Key

1. Go to [resend.com](https://resend.com)
2. Sign up for free account
3. Go to API Keys section
4. Create new API key
5. Copy the key
6. Add to `.env.local`:
   ```bash
   RESEND_API_KEY=re_xxxxxxxxx
   ```

## Testing Without Resend

The system now works without Resend! Here's how:

1. **Register RFID card** - Enter details and click "Send Verification Email"
2. **Check console** - You'll see the verification URL
3. **Copy the URL** - From the console logs
4. **Open in new tab** - Paste the URL to complete verification
5. **Success!** - RFID card will be registered

## Console Output Example

When you register an RFID card, you'll see:
```
=== RFID VERIFICATION ===
Verification URL: http://localhost:3000/api/email/confirm-rfid?token=abc123def456
Email: student@example.com
Student Name: John Doe
RFID Card ID: 0367A8A5
========================
```

## Manual Verification

If the automatic email doesn't work, you can manually verify by:

1. Copy the verification URL from console
2. Open it in a new browser tab
3. The system will automatically register your RFID card
4. You'll be redirected back to the wallet with success message

## Production Setup

For production, you should:

1. **Set up Resend properly** with verified domain
2. **Use proper email templates**
3. **Set up monitoring** for email delivery
4. **Use database** instead of memory for token storage

## Troubleshooting Commands

```bash
# Check if server is running
npm run dev

# Check environment variables
echo $RESEND_API_KEY

# Test API endpoint
curl http://localhost:3000/api/email/test
```

## Success Indicators

✅ **Working correctly when you see:**
- "Verification link generated! Check console for details."
- Verification URL in console
- Successful redirect after clicking verification link
- RFID card appears in wallet

❌ **Not working when you see:**
- "Failed to send verification email"
- No verification URL in console
- 500 error in network tab
- No success message after verification
