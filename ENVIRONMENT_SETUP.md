# Environment Variables Setup Guide

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Razorpay Payment Gateway
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# RFID Security
RFID_SECRET_KEY=your_rfid_secret_key
ADMIN_RFID_KEY=your_admin_rfid_key

# Sanity CMS
NEXT_PUBLIC_SANITY_PROJECT_ID=your_sanity_project_id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=your_sanity_api_token

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## How to Get These Values

### 1. Clerk Authentication
1. Go to [clerk.com](https://clerk.com)
2. Create a new application
3. Copy the publishable key and secret key from the dashboard

### 2. Razorpay Payment Gateway
1. Go to [razorpay.com](https://razorpay.com)
2. Create a new account and get API keys
3. For webhook secret:
   - Go to Settings > Webhooks
   - Create a new webhook with URL: `https://yourdomain.com/api/webhooks/razorpay`
   - Copy the webhook secret

### 3. RFID Security Keys
Generate strong random strings for:
- `RFID_SECRET_KEY`: Used for signing RFID payment requests
- `ADMIN_RFID_KEY`: Used for admin operations like registering RFID cards

### 4. Sanity CMS
1. Go to [sanity.io](https://sanity.io)
2. Create a new project
3. Copy the project ID and dataset name
4. Generate an API token with read/write permissions

## Security Notes

- Never commit `.env.local` to version control
- Use different keys for development and production
- Rotate keys regularly
- Use strong, random strings for security keys
- Enable webhook signature verification for Razorpay

## Testing

After setting up environment variables:

1. Restart your development server
2. Test wallet functionality
3. Test RFID payment system
4. Verify webhook endpoints are working
