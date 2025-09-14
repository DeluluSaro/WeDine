# Email Verification Setup Guide

## Overview
This guide will help you set up email verification for RFID card registration using Resend (free email service).

## Step 1: Get Resend API Key

1. Go to [Resend.com](https://resend.com)
2. Sign up for a free account
3. Go to API Keys section
4. Create a new API key
5. Copy the API key

## Step 2: Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# Resend Email Service
RESEND_API_KEY=your_resend_api_key_here

# Base URL for verification links
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

For production, update `NEXT_PUBLIC_BASE_URL` to your actual domain:
```bash
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

## Step 3: Verify Domain (Optional)

For production, you should verify your domain in Resend:
1. Go to Resend dashboard
2. Add your domain
3. Add the required DNS records
4. Wait for verification

## How It Works

1. **User enters RFID card ID and student name**
2. **System sends verification email** with a secure link
3. **User clicks the link** in their email
4. **System automatically verifies** and registers the RFID card
5. **User is redirected back** to wallet with success message

## Email Template Features

- Beautiful HTML email design
- Shows RFID card details for verification
- Secure verification link (expires in 15 minutes)
- Professional WeDine branding
- Clear call-to-action button

## Free Tier Limits

- **Resend**: 3,000 emails/month (free)
- **Verification tokens**: 15-minute expiration
- **Rate limiting**: Built-in protection

## Testing

1. Start your development server: `npm run dev`
2. Go to `/wallet` page
3. Try to register an RFID card
4. Check your email for the verification link
5. Click the link to complete registration

## Troubleshooting

### Common Issues:

1. **"Failed to send verification email"**
   - Check if RESEND_API_KEY is set correctly
   - Verify the API key is valid

2. **"Invalid verification link"**
   - Check if NEXT_PUBLIC_BASE_URL is set correctly
   - Ensure the URL is accessible

3. **Email not received**
   - Check spam folder
   - Verify email address is correct
   - Check Resend dashboard for delivery status

### Alternative Email Services:

If Resend doesn't work, you can use:

1. **EmailJS** (200 emails/month free)
2. **SendGrid** (100 emails/day free)
3. **Nodemailer with Gmail SMTP** (unlimited with Gmail)

## Security Features

- ✅ Secure token generation
- ✅ 15-minute expiration
- ✅ One-time use tokens
- ✅ Email validation
- ✅ User verification required
- ✅ Automatic cleanup

## Production Checklist

- [ ] Set up Resend account
- [ ] Add API key to environment variables
- [ ] Set correct base URL
- [ ] Verify domain (optional)
- [ ] Test email delivery
- [ ] Monitor email usage
- [ ] Set up error monitoring
