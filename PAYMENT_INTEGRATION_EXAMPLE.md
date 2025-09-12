# Payment Integration Example

This document provides complete examples of how to integrate the payment system in your frontend application.

## Frontend Integration Examples

### 1. COD Payment Integration

```javascript
// COD Payment Handler
const handleCODPayment = async (cartItems, userDetails) => {
  try {
    const response = await fetch('/api/orders/create-cod-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cartItems: cartItems,
        userDetails: userDetails
      })
    });

    const result = await response.json();

    if (result.success) {
      // Clear cart
      clearCart();
      
      // Show success message
      alert(`COD orders created successfully! Total: ₹${result.totalAmount}`);
      
      // Redirect to orders page
      window.location.href = '/orders';
    } else {
      alert(`Error: ${result.error}`);
    }
  } catch (error) {
    console.error('COD payment error:', error);
    alert('Failed to create COD order. Please try again.');
  }
};
```

### 2. Online Payment Integration

```javascript
// Online Payment Handler
const handleOnlinePayment = async (cartItems, userDetails) => {
  try {
    // Step 1: Create Razorpay order
    const response = await fetch('/api/orders/create-online-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cartItems: cartItems,
        userDetails: userDetails
      })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error);
    }

    // Step 2: Initialize Razorpay payment
    const options = result.paymentOptions;
    
    const razorpay = new Razorpay(options);
    
    // Handle payment success
    razorpay.on('payment.success', async (response) => {
      try {
        // Step 3: Verify payment
        const verifyResponse = await fetch('/api/payment/verify-and-update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            orderIds: result.orders.map(order => order.orderId)
          })
        });

        const verifyResult = await verifyResponse.json();

        if (verifyResult.success) {
          // Clear cart
          clearCart();
          
          // Show success message
          alert(`Payment successful! Orders confirmed. Total: ₹${verifyResult.totalAmount}`);
          
          // Redirect to orders page
          window.location.href = '/orders';
        } else {
          alert(`Payment verification failed: ${verifyResult.error}`);
        }
      } catch (verifyError) {
        console.error('Payment verification error:', verifyError);
        alert('Payment verification failed. Please contact support.');
      }
    });

    // Handle payment failure
    razorpay.on('payment.failed', (response) => {
      console.error('Payment failed:', response.error);
      alert(`Payment failed: ${response.error.description}`);
    });

    // Open Razorpay payment modal
    razorpay.open();

  } catch (error) {
    console.error('Online payment error:', error);
    alert('Failed to create online order. Please try again.');
  }
};
```

### 3. Complete Payment Component Example

```jsx
import React, { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useUser } from '@clerk/nextjs';

const PaymentComponent = () => {
  const { cartItems, clearCart } = useCart();
  const { user } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');

  const handlePayment = async () => {
    if (cartItems.length === 0) {
      alert('Your cart is empty!');
      return;
    }

    setIsProcessing(true);

    try {
      const userDetails = {
        userId: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        name: user.fullName,
        phone: user.phoneNumbers[0]?.phoneNumber,
        address: 'Your delivery address' // Get from form
      };

      if (paymentMethod === 'cod') {
        await handleCODPayment(cartItems, userDetails);
      } else {
        await handleOnlinePayment(cartItems, userDetails);
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="payment-component">
      <h2>Choose Payment Method</h2>
      
      <div className="payment-methods">
        <label>
          <input
            type="radio"
            value="cod"
            checked={paymentMethod === 'cod'}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
          Cash on Delivery (COD)
        </label>
        
        <label>
          <input
            type="radio"
            value="online"
            checked={paymentMethod === 'online'}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
          Online Payment (Razorpay)
        </label>
      </div>

      <button
        onClick={handlePayment}
        disabled={isProcessing}
        className="pay-button"
      >
        {isProcessing ? 'Processing...' : `Pay ₹${calculateTotal()}`}
      </button>
    </div>
  );
};

export default PaymentComponent;
```

### 4. Test Payment Integration

```javascript
// Test Payment Handler (for development)
const handleTestPayment = async (orderIds) => {
  try {
    const response = await fetch('/api/payment/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        testMode: true,
        orderIds: orderIds
      })
    });

    const result = await response.json();

    if (result.success) {
      alert(`Test payment successful! Orders confirmed.`);
      window.location.href = '/orders';
    } else {
      alert(`Test payment failed: ${result.error}`);
    }
  } catch (error) {
    console.error('Test payment error:', error);
    alert('Test payment failed. Please try again.');
  }
};

// Get pending orders for testing
const getPendingOrders = async (userId) => {
  try {
    const response = await fetch(`/api/payment/test?userId=${userId}`);
    const result = await response.json();
    
    if (result.success) {
      return result.pendingOrders;
    }
  } catch (error) {
    console.error('Failed to get pending orders:', error);
  }
  return [];
};
```

## Environment Setup

### 1. Install Razorpay

```bash
npm install razorpay
```

### 2. Add Razorpay Script to HTML

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### 3. Environment Variables

Create `.env.local` file:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# Sanity Configuration
SANITY_API_TOKEN=your_sanity_token
```

## Error Handling

### Common Error Scenarios

```javascript
const handlePaymentError = (error) => {
  switch (error.code) {
    case 'PAYMENT_CANCELLED':
      alert('Payment was cancelled by user');
      break;
    case 'PAYMENT_FAILED':
      alert('Payment failed. Please try again.');
      break;
    case 'NETWORK_ERROR':
      alert('Network error. Please check your connection.');
      break;
    case 'INVALID_SIGNATURE':
      alert('Payment verification failed. Please contact support.');
      break;
    default:
      alert('An unexpected error occurred. Please try again.');
  }
};
```

## Testing

### 1. Test Cards (Razorpay Test Mode)

- **Success**: 4111 1111 1111 1111
- **Failure**: 4000 0000 0000 0002
- **CVV**: Any 3 digits
- **Expiry**: Any future date

### 2. Test Payment Flow

```javascript
// Test the complete payment flow
const testPaymentFlow = async () => {
  // 1. Create test cart items
  const testCartItems = [
    {
      _id: 'test_cart_1',
      quantity: 2,
      price: 299,
      foodId: {
        _id: 'test_food_1',
        foodName: 'Test Pizza',
        shopRef: {
          _id: 'test_shop_1',
          shopName: 'Test Shop'
        }
      }
    }
  ];

  // 2. Create test user details
  const testUserDetails = {
    userId: 'test_user_123',
    email: 'test@example.com',
    name: 'Test User',
    phone: '+1234567890',
    address: 'Test Address'
  };

  // 3. Test COD payment
  console.log('Testing COD payment...');
  await handleCODPayment(testCartItems, testUserDetails);

  // 4. Test online payment
  console.log('Testing online payment...');
  await handleOnlinePayment(testCartItems, testUserDetails);
};
```

## Production Checklist

- [ ] Set up production Razorpay keys
- [ ] Configure webhook endpoints
- [ ] Test payment flows thoroughly
- [ ] Set up error monitoring
- [ ] Configure proper error messages
- [ ] Test with real payment methods
- [ ] Set up order tracking
- [ ] Configure email notifications

## Troubleshooting

### Common Issues

1. **"Razorpay is not defined"**
   - Make sure Razorpay script is loaded
   - Check if script is loaded before using Razorpay

2. **"Invalid signature"**
   - Check Razorpay key secret
   - Verify signature generation

3. **"Order not found"**
   - Check if order was created successfully
   - Verify order ID is correct

4. **"Payment verification failed"**
   - Check network connection
   - Verify API endpoints are working
   - Check server logs for errors

### Debug Mode

Enable debug logging:

```javascript
const DEBUG_PAYMENTS = true;

const logPayment = (message, data) => {
  if (DEBUG_PAYMENTS) {
    console.log(`[PAYMENT DEBUG] ${message}`, data);
  }
};
```

This comprehensive integration example should help you implement the payment system successfully in your application.
