# Quick Setup Guide - Payment System

## 🚀 Get Your Payment System Running in 5 Minutes

### Step 1: Environment Variables

Create or update your `.env.local` file:

```env
# Razorpay Configuration (Get these from Razorpay Dashboard)
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_key_secret_here

# Sanity Configuration
SANITY_API_TOKEN=your_sanity_token_here
```

### Step 2: Install Dependencies

```bash
npm install razorpay
```

### Step 3: Add Razorpay Script

Add this to your `app/layout.tsx` or `pages/_app.tsx`:

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### Step 4: Test COD Payment

```javascript
// Test COD payment
const testCOD = async () => {
  const response = await fetch('/api/orders/create-cod-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cartItems: [{
        _id: 'test_1',
        quantity: 2,
        price: 299,
        foodId: {
          _id: 'food_1',
          foodName: 'Test Pizza',
          shopRef: { _id: 'shop_1', shopName: 'Test Shop' }
        }
      }],
      userDetails: {
        userId: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        phone: '+1234567890',
        address: 'Test Address'
      }
    })
  });
  
  const result = await response.json();
  console.log('COD Result:', result);
};
```

### Step 5: Test Online Payment

```javascript
// Test online payment
const testOnline = async () => {
  const response = await fetch('/api/orders/create-online-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cartItems: [{
        _id: 'test_1',
        quantity: 2,
        price: 299,
        foodId: {
          _id: 'food_1',
          foodName: 'Test Pizza',
          shopRef: { _id: 'shop_1', shopName: 'Test Shop' }
        }
      }],
      userDetails: {
        userId: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        phone: '+1234567890',
        address: 'Test Address'
      }
    })
  });
  
  const result = await response.json();
  console.log('Online Payment Result:', result);
  
  if (result.success) {
    // Initialize Razorpay
    const razorpay = new Razorpay(result.paymentOptions);
    razorpay.open();
  }
};
```

### Step 6: Test Payment Verification

```javascript
// Test payment verification (after successful payment)
const testVerification = async () => {
  const response = await fetch('/api/payment/verify-and-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_order_id: 'order_xyz123',
      razorpay_payment_id: 'pay_abc456',
      razorpay_signature: 'signature_hash',
      orderIds: ['order_1', 'order_2'] // From create-online-order response
    })
  });
  
  const result = await response.json();
  console.log('Verification Result:', result);
};
```

### Step 7: Test Mode (Skip Real Payment)

```javascript
// Test payment without real Razorpay (for development)
const testMode = async () => {
  const response = await fetch('/api/payment/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      testMode: true,
      orderIds: ['order_1', 'order_2'] // Your pending order IDs
    })
  });
  
  const result = await response.json();
  console.log('Test Mode Result:', result);
};
```

## 🔧 Quick Fixes for Common Issues

### Issue 1: "Razorpay is not defined"
**Solution**: Add Razorpay script to your HTML head:
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### Issue 2: "Missing environment variables"
**Solution**: Check your `.env.local` file has:
```env
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
SANITY_API_TOKEN=...
```

### Issue 3: "Shop missing Razorpay Account ID"
**Solution**: Set up shop Razorpay account:
```javascript
const setupShop = async () => {
  const response = await fetch('/api/razorpay/routes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shopId: 'your_shop_id',
      shopName: 'Your Shop Name',
      ownerMobile: '+918754502573',
      ownerEmail: 'owner@example.com'
    })
  });
  
  const result = await response.json();
  console.log('Shop Setup:', result);
};
```

### Issue 4: "Payment verification failed"
**Solution**: Check if you're passing the correct parameters:
```javascript
// Make sure you have these from Razorpay response:
{
  razorpay_order_id: response.razorpay_order_id,
  razorpay_payment_id: response.razorpay_payment_id,
  razorpay_signature: response.razorpay_signature,
  orderIds: ['order_1', 'order_2'] // From create-online-order
}
```

## 🧪 Testing Checklist

- [ ] COD payment creates orders successfully
- [ ] Online payment creates Razorpay order
- [ ] Payment verification updates order status
- [ ] Orders appear in order history
- [ ] Error handling works properly
- [ ] Test mode works for development

## 📞 Need Help?

1. Check the browser console for errors
2. Check the server logs for API errors
3. Verify environment variables are set
4. Test with the test mode first
5. Use the test cards for Razorpay testing

## 🎯 Next Steps

1. **Set up real Razorpay account** for production
2. **Configure webhooks** for automatic payment updates
3. **Add email notifications** for order confirmations
4. **Set up order tracking** for customers
5. **Add admin dashboard** for order management

Your payment system is now ready to use! 🎉
