# WeDine Payment System Documentation

This document provides comprehensive documentation for the payment system that handles both Cash on Delivery (COD) and Razorpay online payments with shop-specific account management.

## Table of Contents

1. [System Overview](#system-overview)
2. [COD Payment System](#cod-payment-system)
3. [Razorpay Online Payment System](#razorpay-online-payment-system)
4. [Shop Razorpay Account Management](#shop-razorpay-account-management)
5. [Payment Verification](#payment-verification)
6. [API Endpoints](#api-endpoints)
7. [Error Handling](#error-handling)
8. [Setup Instructions](#setup-instructions)

## System Overview

The WeDine payment system supports two payment methods:

1. **Cash on Delivery (COD)** - Simple order creation without online payment
2. **Razorpay Online Payment** - Secure online payments with automatic transfers to shop owners

### Key Features

- **Multi-vendor Support**: Orders are automatically split by shop
- **Shop-specific Razorpay Accounts**: Each shop has its own Razorpay account ID
- **Automatic Transfers**: Online payments are automatically transferred to respective shops
- **Order Tracking**: Complete order lifecycle management
- **Payment Verification**: Secure payment verification with signature validation

## COD Payment System

### How it Works

1. User selects COD payment method
2. System creates separate orders for each shop
3. Orders are stored with `paymentStatus: false`
4. No online payment processing required

### API Endpoint

**POST** `/api/orders/create-cod-order`

**Request Body:**
```json
{
  "cartItems": [
    {
      "_id": "cart_item_1",
      "quantity": 2,
      "price": 299,
      "foodId": {
        "_id": "food_1",
        "foodName": "Pizza Margherita",
        "shopRef": {
          "_id": "shop_1",
          "shopName": "Mario's Pizza"
        }
      }
    }
  ],
  "userDetails": {
    "userId": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "address": "123 Main St, City"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "COD orders created successfully",
  "orders": [
    {
      "orderId": "order_1",
      "orderIdentifier": "COD-1234567890-shop_1-abc123",
      "shopName": "Mario's Pizza",
      "total": 598,
      "items": [...]
    }
  ],
  "totalAmount": 598,
  "orderCount": 1
}
```

## Razorpay Online Payment System

### How it Works

1. User selects online payment method
2. System groups items by shop and calculates amounts
3. Creates Razorpay order with transfers to each shop's account
4. Creates pending order records in database
5. User completes payment on Razorpay
6. Payment verification updates order status

### API Endpoint

**POST** `/api/orders/create-online-order`

**Request Body:**
```json
{
  "cartItems": [
    {
      "_id": "cart_item_1",
      "quantity": 2,
      "price": 299,
      "foodId": {
        "_id": "food_1",
        "foodName": "Pizza Margherita",
        "shopRef": {
          "_id": "shop_1",
          "shopName": "Mario's Pizza"
        }
      }
    }
  ],
  "userDetails": {
    "userId": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "address": "123 Main St, City"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Razorpay order created successfully",
  "razorpayOrderId": "order_xyz123",
  "amount": 59800,
  "currency": "INR",
  "orders": [
    {
      "orderId": "order_1",
      "orderIdentifier": "ONLINE-1234567890-shop_1-abc123",
      "shopName": "Mario's Pizza",
      "amount": 598,
      "razorpayAccountId": "acc_shop_1_123"
    }
  ],
  "totalAmount": 598,
  "orderCount": 1,
  "paymentOptions": {
    "key": "rzp_test_...",
    "amount": 59800,
    "currency": "INR",
    "order_id": "order_xyz123",
    "name": "WeDine",
    "description": "Food delivery payment",
    "prefill": {
      "name": "John Doe",
      "email": "user@example.com",
      "contact": "+1234567890"
    },
    "theme": {
      "color": "#F59E0B"
    }
  }
}
```

## Shop Razorpay Account Management

### Setting up Shop Razorpay Accounts

Each shop needs a Razorpay account ID to receive payments. This can be set up using the Razorpay routes API.

**POST** `/api/razorpay/routes`

**Request Body:**
```json
{
  "shopId": "shop_1",
  "shopName": "Mario's Pizza",
  "ownerMobile": "+918754502573",
  "ownerEmail": "mario@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Razorpay account ID generated successfully",
  "razorpayAccountId": "acc_shop_1_1234567890",
  "shopId": "shop_1",
  "shopName": "Mario's Pizza",
  "ownerMobile": "+918754502573",
  "ownerEmail": "mario@example.com"
}
```

### Getting Shop Razorpay Information

**GET** `/api/razorpay/routes?shopId=shop_1`

**Response:**
```json
{
  "success": true,
  "shop": {
    "id": "shop_1",
    "shopName": "Mario's Pizza",
    "razorpayAccountId": "acc_shop_1_1234567890",
    "ownerMobile": "+918754502573",
    "ownerEmail": "mario@example.com",
    "isActive": true,
    "hasRazorpayAccount": true
  }
}
```

## Payment Verification

### How Payment Verification Works

1. User completes payment on Razorpay
2. Frontend calls payment verification API with payment details
3. System verifies Razorpay signature
4. Updates all related orders to confirmed status
5. Creates order history records

### API Endpoint

**POST** `/api/payment/verify-and-update`

**Request Body:**
```json
{
  "razorpay_order_id": "order_xyz123",
  "razorpay_payment_id": "pay_abc456",
  "razorpay_signature": "signature_hash",
  "orderIds": ["order_1", "order_2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified and orders updated successfully",
  "paymentId": "pay_abc456",
  "razorpayOrderId": "order_xyz123",
  "totalAmount": 598,
  "updatedOrders": [
    {
      "orderId": "order_1",
      "orderIdentifier": "ONLINE-1234567890-shop_1-abc123",
      "shopName": "Mario's Pizza",
      "amount": 598,
      "status": "confirmed"
    }
  ],
  "summary": {
    "totalOrders": 1,
    "confirmedOrders": 1,
    "failedOrders": 0
  }
}
```

## API Endpoints

### Order Creation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders/create-cod-order` | Create COD orders |
| POST | `/api/orders/create-online-order` | Create online payment orders |

### Payment Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payment/verify-and-update` | Verify and update payment status |
| GET | `/api/payment/status` | Get payment status |
| POST | `/api/payment/status` | Update payment status (webhook) |

### Razorpay Account Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/razorpay/routes` | Create Razorpay account for shop |
| GET | `/api/razorpay/routes` | Get shop Razorpay information |
| PUT | `/api/razorpay/routes` | Update shop Razorpay account ID |

## Error Handling

### Common Error Responses

**Missing Required Fields:**
```json
{
  "error": "Invalid request: cart items and user details are required"
}
```

**Razorpay Configuration Missing:**
```json
{
  "error": "Razorpay configuration missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET"
}
```

**Shop Missing Razorpay Account:**
```json
{
  "error": "Shop Mario's Pizza is missing Razorpay Account ID. Please configure it in the shop settings."
}
```

**Invalid Payment Signature:**
```json
{
  "error": "Invalid payment signature"
}
```

### Error Status Codes

- `400`: Bad Request (missing or invalid parameters)
- `404`: Not Found (shop or order not found)
- `500`: Internal Server Error (server or Razorpay API error)

## Setup Instructions

### 1. Environment Variables

Add these to your `.env.local` file:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# Sanity Configuration
SANITY_API_TOKEN=your_sanity_token
```

### 2. Shop Configuration

1. Create shops in Sanity CMS
2. Set up Razorpay accounts for each shop using `/api/razorpay/routes`
3. Ensure each shop has a valid `razorpayAccountId`

### 3. Frontend Integration

#### COD Payment Flow

```javascript
const createCODOrder = async (cartItems, userDetails) => {
  const response = await fetch('/api/orders/create-cod-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartItems, userDetails })
  });
  
  const result = await response.json();
  if (result.success) {
    // Clear cart and show success message
    console.log('COD orders created:', result.orders);
  }
};
```

#### Online Payment Flow

```javascript
const createOnlineOrder = async (cartItems, userDetails) => {
  // Create Razorpay order
  const response = await fetch('/api/orders/create-online-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartItems, userDetails })
  });
  
  const result = await response.json();
  if (result.success) {
    // Initialize Razorpay payment
    const options = result.paymentOptions;
    const razorpay = new Razorpay(options);
    
    razorpay.on('payment.success', async (response) => {
      // Verify payment
      await verifyPayment(response, result.orders.map(o => o.orderId));
    });
    
    razorpay.open();
  }
};

const verifyPayment = async (paymentResponse, orderIds) => {
  const response = await fetch('/api/payment/verify-and-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_order_id: paymentResponse.razorpay_order_id,
      razorpay_payment_id: paymentResponse.razorpay_payment_id,
      razorpay_signature: paymentResponse.razorpay_signature,
      orderIds
    })
  });
  
  const result = await response.json();
  if (result.success) {
    // Clear cart and show success message
    console.log('Payment verified:', result.updatedOrders);
  }
};
```

### 4. Webhook Setup (Optional)

For production, set up Razorpay webhooks to handle payment status updates:

1. Configure webhook URL in Razorpay dashboard
2. Handle webhook events in `/api/payment/status` (POST method)
3. Verify webhook signatures for security

## Security Considerations

1. **Signature Verification**: Always verify Razorpay signatures
2. **Environment Variables**: Keep Razorpay keys secure
3. **Webhook Security**: Verify webhook signatures
4. **Input Validation**: Validate all input data
5. **Error Handling**: Don't expose sensitive information in errors

## Testing

### Test Cards (Razorpay Test Mode)

- **Success**: 4111 1111 1111 1111
- **Failure**: 4000 0000 0000 0002
- **CVV**: Any 3 digits
- **Expiry**: Any future date

### Test Scenarios

1. **COD Orders**: Test with multiple shops
2. **Online Payments**: Test success and failure scenarios
3. **Multi-vendor Orders**: Test orders with items from different shops
4. **Payment Verification**: Test signature verification
5. **Error Handling**: Test with invalid data

## Troubleshooting

### Common Issues

1. **"Razorpay configuration missing"**
   - Check environment variables
   - Ensure keys are correct

2. **"Shop missing Razorpay Account ID"**
   - Set up Razorpay account for shop
   - Use `/api/razorpay/routes` to create account

3. **"Invalid payment signature"**
   - Check Razorpay key secret
   - Verify signature generation

4. **"Order not found"**
   - Check order ID
   - Ensure order exists in database

### Debug Mode

Enable debug logging by setting:
```env
DEBUG_PAYMENTS=true
```

This will log detailed payment information for troubleshooting.
