# Razorpay Payment Integration Setup Guide

## Overview

This guide covers the complete setup and implementation of Razorpay payment gateway with multi-vendor payment splitting for the WeDine food delivery platform.

## Features Implemented

✅ **Dual Payment Methods**: Online (Razorpay) and Cash on Delivery (COD)  
✅ **Multi-Vendor Payment Splitting**: Automatic payment distribution to shop owners  
✅ **Enhanced Database Schema**: Comprehensive payment tracking and lifecycle management  
✅ **Payment Verification**: Secure signature verification and transaction validation  
✅ **Order Lifecycle Management**: Integration with existing dual schema system  
✅ **Real-time Payment Status**: Live payment status updates and notifications  

## Prerequisites

- Razorpay account with API access
- Vercel deployment with environment variables
- Sanity CMS with write permissions
- Next.js application with TypeScript

## Environment Variables Setup

### Required Environment Variables

Add these to your `.env.local` file and Vercel deployment:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_test_key_id

# Sanity Configuration
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=your_write_token

# Optional: Cron Job Security
CRON_SECRET_TOKEN=your_secret_token
```

### Setting Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable with appropriate environment (Production, Preview, Development)

## Database Schema Updates

### Enhanced Order Schema

The order schema now includes comprehensive payment tracking:

```typescript
// Key new fields in order schema
{
  orderStatus: boolean, // True = Paid, False = Unpaid
  paymentMethod: 'cod' | 'online',
  paymentDetails: {
    razorpayPaymentId: string,
    razorpayOrderId: string,
    razorpaySignature: string,
    transactionId: string,
    paymentStatus: 'pending' | 'success' | 'failed',
    paidAt: datetime,
    splits: [{
      shopId: string,
      shopName: string,
      ownerMobile: string,
      splitAmount: number,
      transferId: string,
      transferStatus: 'pending' | 'completed' | 'failed',
      transferredAt: datetime
    }]
  }
}
```

### Enhanced Shop Schema

Shop schema includes owner details for payment transfers:

```typescript
// Key new fields in shop schema
{
  ownerMobile: string, // Format: +91-XXXXXXXXXX
  ownerEmail: string,
  razorpayAccountId: string, // For payment transfers
  isActive: boolean,
  category: string,
  rating: number,
  totalReviews: number
}
```

## API Endpoints

### 1. Order Creation (`/api/orders/create-order`)

**Purpose**: Creates orders with payment method selection and Razorpay integration

**Features**:
- Supports both COD and online payment methods
- Creates Razorpay orders for online payments
- Calculates payment splits for multi-vendor orders
- Creates records in both active and history schemas

**Request Body**:
```json
{
  "cartItems": [
    {
      "_id": "item_id",
      "foodId": {
        "_id": "food_id",
        "foodName": "Pizza",
        "price": 200,
        "shopRef": {
          "_id": "shop_id",
          "shopName": "Pizza Corner",
          "ownerMobile": "+91-9876543210"
        }
      },
      "quantity": 2,
      "price": 200
    }
  ],
  "paymentMethod": "online",
  "userDetails": {
    "userId": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+91-1234567890"
  }
}
```

### 2. Payment Verification (`/api/payment/verify-and-update`)

**Purpose**: Verifies Razorpay payments and executes vendor transfers

**Features**:
- Verifies payment signature for security
- Updates order status to paid
- Executes payment splits to shop owners
- Updates both active and history schemas

**Request Body**:
```json
{
  "razorpay_payment_id": "pay_xxx",
  "razorpay_order_id": "order_xxx",
  "razorpay_signature": "signature_xxx",
  "orderDbId": "order_database_id"
}
```

## Payment Flow

### Online Payment Flow

1. **User selects online payment** in BuyNowPopup
2. **Order creation** via `/api/orders/create-order`
3. **Razorpay order creation** with payment splits
4. **Razorpay payment modal** opens for user payment
5. **Payment verification** via `/api/payment/verify-and-update`
6. **Payment splits execution** to shop owners
7. **Database updates** with payment success status

### COD Payment Flow

1. **User selects COD** in BuyNowPopup
2. **Order creation** via `/api/orders/create-order`
3. **Database updates** with COD status
4. **Order confirmation** to user

## Multi-Vendor Payment Splitting

### How It Works

1. **Order Analysis**: System analyzes cart items by shop
2. **Split Calculation**: Calculates amount due to each shop owner
3. **Transfer Execution**: Automatically transfers funds to shop owners
4. **Status Tracking**: Tracks transfer status for each vendor

### Example Split

```typescript
// Cart with items from multiple shops
const cartItems = [
  { shopId: "shop1", amount: 300 }, // Pizza Corner
  { shopId: "shop2", amount: 200 }, // Burger House
  { shopId: "shop1", amount: 100 }  // Pizza Corner again
];

// Resulting splits
const splits = [
  { shopId: "shop1", shopName: "Pizza Corner", splitAmount: 400 },
  { shopId: "shop2", shopName: "Burger House", splitAmount: 200 }
];
```

## Frontend Integration

### BuyNowPopup Component

The enhanced BuyNowPopup component now supports:

- **Payment method selection** (COD vs Online)
- **Razorpay integration** for online payments
- **Real-time error handling** and success messages
- **User authentication** validation
- **Automatic order creation** and payment processing

### Key Features

```typescript
// Payment method selection
const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');

// Razorpay integration
const handleOnlinePayment = async () => {
  // Create order
  const orderResponse = await fetch('/api/orders/create-order', {...});
  
  // Initialize Razorpay
  const options = {
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    amount: Math.round(amount * 100),
    currency: 'INR',
    order_id: orderId,
    handler: async function(response) {
      // Verify payment
      await fetch('/api/payment/verify-and-update', {...});
    }
  };
  
  const rzp = new Razorpay(options);
  rzp.open();
};
```

## Testing

### Test Mode Setup

1. **Use Razorpay test keys** for development
2. **Test payment methods**:
   - Card: 4111 1111 1111 1111
   - UPI: success@razorpay
   - Net Banking: Any bank

### Test Scenarios

1. **Single vendor order** with online payment
2. **Multi-vendor order** with payment splitting
3. **COD order** creation
4. **Payment failure** handling
5. **Payment verification** with invalid signature

### Manual Testing Commands

```bash
# Test order creation
curl -X POST http://localhost:3000/api/orders/create-order \
  -H "Content-Type: application/json" \
  -d '{"cartItems":[...],"paymentMethod":"online","userDetails":{...}}'

# Test payment verification
curl -X POST http://localhost:3000/api/payment/verify-and-update \
  -H "Content-Type: application/json" \
  -d '{"razorpay_payment_id":"...","razorpay_order_id":"...","razorpay_signature":"...","orderDbId":"..."}'
```

## Production Deployment

### 1. Update Environment Variables

Replace test keys with production keys:

```env
RAZORPAY_KEY_ID=rzp_live_your_live_key_id
RAZORPAY_KEY_SECRET=your_live_key_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_your_live_key_id
```

### 2. Configure Webhooks (Optional)

Set up Razorpay webhooks for additional security:

```typescript
// Webhook endpoint for payment events
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers.get('x-razorpay-signature');
  
  // Verify webhook signature
  const isValid = verifyWebhookSignature(req.body, signature, webhookSecret);
  
  if (isValid) {
    // Handle webhook events
    const event = await req.json();
    // Process payment events
  }
}
```

### 3. Monitor Payment Transfers

Set up monitoring for payment transfers:

```typescript
// Monitor transfer status
const transferStatus = await razorpay.transfers.fetch(transferId);
console.log(`Transfer ${transferId}: ${transferStatus.status}`);
```

## Security Considerations

### 1. Payment Verification

- Always verify Razorpay signatures
- Use HTTPS in production
- Validate payment amounts server-side

### 2. Data Protection

- Store sensitive data in environment variables
- Use secure database connections
- Implement proper error handling

### 3. Rate Limiting

- Implement rate limiting for payment endpoints
- Monitor for suspicious activity
- Set up alerts for failed payments

## Troubleshooting

### Common Issues

1. **Payment Signature Verification Failed**
   - Check environment variables
   - Verify webhook secret
   - Ensure correct signature generation

2. **Transfer to Shop Owner Failed**
   - Verify shop owner mobile number format
   - Check Razorpay account status
   - Validate transfer amount

3. **Order Creation Failed**
   - Check Sanity API token
   - Verify schema deployment
   - Validate cart items structure

### Debug Commands

```bash
# Check Razorpay connection
curl -u "key_id:key_secret" https://api.razorpay.com/v1/orders

# Verify Sanity connection
curl -H "Authorization: Bearer token" https://project.sanity.io/v1/data/query/production
```

## Support

For issues with:
- **Razorpay Integration**: Check Razorpay documentation
- **Payment Splitting**: Review transfer API documentation
- **Database Schema**: Verify Sanity schema deployment
- **Frontend Integration**: Check browser console for errors

## Next Steps

1. **Deploy to production** with live Razorpay keys
2. **Set up monitoring** for payment transfers
3. **Configure webhooks** for additional security
4. **Implement refund handling** for failed transfers
5. **Add payment analytics** and reporting