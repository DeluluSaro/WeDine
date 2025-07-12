# SMS Notification Setup Guide

This guide explains how to set up SMS notifications for stock alerts in the WeDine application.

## Features Added

1. **Owner Mobile Number**: Added to shop schema for contact information
2. **Stock Over Alerts**: When items are out of stock, users can:
   - See the owner's contact number
   - Send SMS alert to shop owner about stock shortage

## Setup Instructions

### SMS Service (Twilio)

1. **Install Twilio SDK**:
   ```bash
   npm install twilio
   ```

2. **Set up environment variables** in `.env.local`:
   ```
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number
   ```

3. **Twilio Configuration** in `lib/notifications.ts`:
   ```typescript
   const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
   await client.messages.create({
     body: `🚨 STOCK ALERT: ${foodName} is out of stock at ${shopName}. Please restock immediately!`,
     from: process.env.TWILIO_PHONE_NUMBER,
     to: ownerMobile
   });
   ```

## How It Works

1. **Stock Detection**: When `quantity === 0`, items are marked as out of stock
2. **Visual Feedback**: Out-of-stock items show:
   - "Stock Over" overlay
   - Owner's contact number
   - "Send SMS Alert" button
3. **Notifications**:
   - **SMS to Owner**: Immediate alert about stock shortage

## User Experience

- **Out-of-stock items** are visually distinct (grayed out, no hover effects)
- **Contact information** is prominently displayed
- **SMS notification system** allows users to alert shop owners
- **Real-time updates** through Sanity's live preview

## Security Notes

- API routes handle sensitive operations server-side
- User authentication required for notifications
- Environment variables protect API keys
- Rate limiting recommended for production

## Testing

1. Set item quantity to 0 in Sanity Studio
2. View the item on the booking page
3. Click "Send SMS Alert" button
4. Check console logs for notification details
5. Verify SMS delivery to shop owner

## Production Considerations

- Implement proper error handling
- Add rate limiting for notifications
- Set up monitoring for failed notifications
- Consider using webhooks for real-time stock updates
- Implement notification preferences for users 