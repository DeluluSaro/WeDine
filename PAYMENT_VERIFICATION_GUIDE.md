# Payment Verification Guide

This guide explains how to use the different payment verification methods available in the system.

## Available Payment Verification Methods

### 1. Standard Razorpay Verification (`/api/payment/verify-and-update`)

**Use this when:** You have completed a real Razorpay payment and have the payment details.

**Required Parameters:**
```json
{
  "razorpay_order_id": "order_xyz123",
  "razorpay_payment_id": "pay_abc456", 
  "razorpay_signature": "signature_hash",
  "orderIds": ["order_1", "order_2"] // Optional: specific order IDs
}
```

**Example:**
```javascript
const verifyPayment = async (razorpayResponse, orderIds) => {
  const response = await fetch('/api/payment/verify-and-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_order_id: razorpayResponse.razorpay_order_id,
      razorpay_payment_id: razorpayResponse.razorpay_payment_id,
      razorpay_signature: razorpayResponse.razorpay_signature,
      orderIds: orderIds
    })
  });
  
  const result = await response.json();
  return result;
};
```

### 2. Simple Verification (`/api/payment/verify-simple`)

**Use this when:** You want to verify orders without Razorpay signature validation.

**Required Parameters:**
```json
{
  "orderIds": ["order_1", "order_2"],
  "userId": "user_123", // Optional: filter by user
  "paymentMethod": "online" // Optional: cod or online
}
```

**Example:**
```javascript
const verifySimple = async (orderIds) => {
  const response = await fetch('/api/payment/verify-simple', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderIds: orderIds
    })
  });
  
  const result = await response.json();
  return result;
};
```

### 3. Manual Verification (`/api/payment/verify-manual`)

**Use this when:** You want to manually confirm payments (admin use).

**Required Parameters:**
```json
{
  "orderIds": ["order_1", "order_2"], // OR
  "userId": "user_123",
  "confirmAll": true // Confirm all pending orders for user
}
```

**Example:**
```javascript
const verifyManual = async (orderIds) => {
  const response = await fetch('/api/payment/verify-manual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderIds: orderIds
    })
  });
  
  const result = await response.json();
  return result;
};
```

### 4. Test Mode (`/api/payment/test`)

**Use this when:** You're in development and want to test without real payments.

**Required Parameters:**
```json
{
  "testMode": true,
  "orderIds": ["order_1", "order_2"] // Optional
}
```

**Example:**
```javascript
const testPayment = async (orderIds) => {
  const response = await fetch('/api/payment/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      testMode: true,
      orderIds: orderIds
    })
  });
  
  const result = await response.json();
  return result;
};
```

## Getting Pending Orders

### Get Orders for Manual Verification
```javascript
const getPendingOrders = async (userId) => {
  const response = await fetch(`/api/payment/verify-manual?userId=${userId}`);
  const result = await response.json();
  return result.orders;
};
```

### Get Orders for Simple Verification
```javascript
const getOrdersForSimpleVerification = async (userId) => {
  const response = await fetch(`/api/payment/verify-simple?userId=${userId}`);
  const result = await response.json();
  return result.orders;
};
```

### Get Test Orders
```javascript
const getTestOrders = async (userId) => {
  const response = await fetch(`/api/payment/test?userId=${userId}`);
  const result = await response.json();
  return result.pendingOrders;
};
```

## Debug and Troubleshooting

### Get Debug Information
```javascript
const getDebugInfo = async (userId) => {
  const response = await fetch(`/api/payment/debug?userId=${userId}`);
  const result = await response.json();
  return result.debug;
};
```

### Cleanup Old Pending Orders
```javascript
const cleanupOldOrders = async () => {
  const response = await fetch('/api/payment/debug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'cleanup_pending_orders',
      olderThanMinutes: 30
    })
  });
  
  const result = await response.json();
  return result;
};
```

## Complete Payment Flow Examples

### Example 1: Real Razorpay Payment Flow
```javascript
const handleRealPayment = async (cartItems, userDetails) => {
  try {
    // 1. Create online order
    const orderResponse = await fetch('/api/orders/create-online-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartItems, userDetails })
    });
    
    const orderResult = await orderResponse.json();
    
    if (!orderResult.success) {
      throw new Error(orderResult.error);
    }
    
    // 2. Initialize Razorpay
    const razorpay = new Razorpay(orderResult.paymentOptions);
    
    // 3. Handle payment success
    razorpay.on('payment.success', async (response) => {
      // 4. Verify payment
      const verifyResponse = await fetch('/api/payment/verify-and-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          orderIds: orderResult.orders.map(o => o.orderId)
        })
      });
      
      const verifyResult = await verifyResponse.json();
      
      if (verifyResult.success) {
        console.log('Payment verified successfully!');
        // Clear cart, redirect, etc.
      } else {
        console.error('Payment verification failed:', verifyResult.error);
      }
    });
    
    // 5. Open payment modal
    razorpay.open();
    
  } catch (error) {
    console.error('Payment error:', error);
  }
};
```

### Example 2: Development/Testing Flow
```javascript
const handleTestPayment = async (cartItems, userDetails) => {
  try {
    // 1. Create online order
    const orderResponse = await fetch('/api/orders/create-online-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartItems, userDetails })
    });
    
    const orderResult = await orderResponse.json();
    
    if (!orderResult.success) {
      throw new Error(orderResult.error);
    }
    
    // 2. Simulate payment success (for testing)
    setTimeout(async () => {
      // 3. Verify payment in test mode
      const verifyResponse = await fetch('/api/payment/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testMode: true,
          orderIds: orderResult.orders.map(o => o.orderId)
        })
      });
      
      const verifyResult = await verifyResponse.json();
      
      if (verifyResult.success) {
        console.log('Test payment verified successfully!');
        // Clear cart, redirect, etc.
      } else {
        console.error('Test payment verification failed:', verifyResult.error);
      }
    }, 2000); // Simulate 2-second payment process
    
  } catch (error) {
    console.error('Test payment error:', error);
  }
};
```

### Example 3: Manual Admin Verification
```javascript
const handleManualVerification = async (orderIds) => {
  try {
    const response = await fetch('/api/payment/verify-manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderIds: orderIds
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Orders manually verified:', result.updatedOrders);
    } else {
      console.error('Manual verification failed:', result.error);
    }
    
  } catch (error) {
    console.error('Manual verification error:', error);
  }
};
```

## Error Handling

### Common Error Responses
```javascript
const handlePaymentError = (error) => {
  switch (error.error) {
    case 'Missing payment verification parameters':
      console.log('Need to provide Razorpay payment details or order IDs');
      break;
    case 'Invalid payment signature':
      console.log('Razorpay signature verification failed');
      break;
    case 'Order not found':
      console.log('The specified order does not exist');
      break;
    case 'Payment verification failed':
      console.log('General payment verification error');
      break;
    default:
      console.log('Unknown error:', error.error);
  }
};
```

## Best Practices

1. **Always handle errors** - Check for `success` field in responses
2. **Use appropriate verification method** - Choose the right API for your use case
3. **Store order IDs** - Keep track of order IDs from order creation
4. **Test thoroughly** - Use test mode during development
5. **Monitor payments** - Use debug APIs to monitor payment status
6. **Clean up old orders** - Regularly clean up old pending orders

## Quick Reference

| Method | Use Case | Required Parameters |
|--------|----------|-------------------|
| `/api/payment/verify-and-update` | Real Razorpay payments | `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` |
| `/api/payment/verify-simple` | Simple verification | `orderIds` |
| `/api/payment/verify-manual` | Manual admin verification | `orderIds` or `userId` + `confirmAll` |
| `/api/payment/test` | Development testing | `testMode: true` |

This guide should help you choose the right payment verification method for your specific use case!
