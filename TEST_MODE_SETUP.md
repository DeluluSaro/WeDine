# Test Mode Setup Guide

## Quick Setup for Testing

### 1. Environment Variables (Minimum Required)
Create a `.env.local` file with these variables:

```env
# Sanity CMS (Required for wallet functionality)
NEXT_PUBLIC_SANITY_PROJECT_ID=your_sanity_project_id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=your_sanity_api_token

# Razorpay (For payment testing)
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_test_key_id
RAZORPAY_KEY_SECRET=your_razorpay_test_key_secret

# Optional for full functionality
RFID_SECRET_KEY=test_rfid_secret_key
ADMIN_RFID_KEY=test_admin_key
```

### 2. Sanity Setup
1. Go to [sanity.io](https://sanity.io) and create a project
2. Copy your Project ID and Dataset name
3. Generate an API token with **Editor** permissions (not just Viewer)
4. Add the token to your environment variables

### 3. Razorpay Test Mode
1. Go to [razorpay.com](https://razorpay.com) and create an account
2. Go to Settings > API Keys
3. Generate test API keys (they start with `rzp_test_`)
4. Add them to your environment variables

### 4. Test the System

#### Option 1: Use Test Setup Button (Easiest)
1. Go to `/wallet` page
2. Click "Test Setup (₹1000)" button
3. This creates a wallet with ₹1000 balance instantly
4. No payment required - perfect for testing!

#### Option 2: Test Real Payments
1. Go to `/wallet` page
2. Click "Add Money"
3. Enter amount (minimum ₹10)
4. Use Razorpay test cards:
   - **Success**: 4111 1111 1111 1111
   - **Failure**: 4000 0000 0000 0002
   - **CVV**: Any 3 digits
   - **Expiry**: Any future date

### 5. Test RFID Payments
1. Create an order in the system
2. Go to Orders page
3. Click "Pay with RFID" on an unpaid order
4. The system will simulate RFID payment from wallet balance

## Troubleshooting

### Sanity Permission Errors
If you get "Insufficient permissions" errors:
1. Check your SANITY_API_TOKEN has Editor permissions
2. Make sure the token is not expired
3. Verify the project ID and dataset name are correct

### Razorpay Test Mode
- Use test API keys (rzp_test_...)
- Test cards work without real money
- Webhook testing requires ngrok or similar tool

### Wallet Not Loading
- Check browser console for errors
- Verify Sanity connection
- Try the "Test Setup" button first

## Test Data

### Sample RFID Cards (for testing)
Add these to `/api/payment/rfid/route.ts`:
```typescript
const RFID_CARD_MAPPINGS: Record<string, string> = {
  'A1B2C3D4': 'your_test_email@vitstudent.ac.in',
  'E5F6G7H8': 'another_test_email@vitstudent.ac.in',
};
```

### Test Orders
Create some test orders in Sanity Studio to test RFID payments.

## Development vs Production

### Development Mode
- Test Setup button is visible
- More detailed error messages
- Hot reloading enabled

### Production Mode
- Test Setup button hidden
- Optimized for performance
- Real payment processing

## Next Steps

1. **Test Basic Flow**: Create wallet → Add money → Make RFID payment
2. **Test Error Cases**: Insufficient balance, invalid cards, etc.
3. **Test Edge Cases**: Browser refresh during payment, network issues
4. **Production Setup**: Switch to live Razorpay keys and proper webhooks

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check the terminal/server logs
3. Verify all environment variables are set
4. Test with the "Test Setup" button first
