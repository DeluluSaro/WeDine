# Duplicate Order Prevention System - Complete Guide

## Overview

This guide explains the comprehensive duplicate order prevention system implemented in the WeDine application. The system prevents duplicate orders across both COD and online payment methods through multiple layers of protection.

## 🛡️ Prevention Layers

### 1. Database Schema Level
- **Unique Constraints**: Added `orderIdentifier` field with unique validation
- **Dual Schema Management**: Proper handling of `order` and `orderHistory` schemas
- **Automatic Cleanup**: Removal of old pending orders

### 2. API Level
- **Time-based Duplicate Detection**: Checks for recent orders within configurable time windows
- **Item Comparison**: Compares cart items to detect similar orders
- **Payment Method Specific**: Different handling for COD vs online payments

### 3. Frontend Level
- **Button Disabling**: Prevents multiple clicks during order processing
- **State Management**: Multiple state variables to track processing status
- **User Feedback**: Clear visual indicators during order processing

## 🔧 Implementation Details

### Unique Order Identifier Generation

```typescript
// Generates unique identifier with entropy
export function generateUniqueOrderIdentifier(
  userId: string, 
  cartItems: any[], 
  paymentMethod: 'cod' | 'online'
): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const itemHash = cartItems
    .map(item => `${item.foodId?.foodName || item.foodName}-${item.quantity}`)
    .sort()
    .join('|');
  
  return `${userId}_${paymentMethod}_${itemHash}_${timestamp}_${randomSuffix}`;
}
```

### Duplicate Detection Logic

```typescript
// Checks for duplicates within time window
async function checkForDuplicateOrder(userId: string, cartItems: CartItem[], paymentMethod: 'cod' | 'online') {
  const timeWindow = process.env.NODE_ENV === 'development' ? 2 : 5; // minutes
  const cutoffTime = new Date(Date.now() - timeWindow * 60 * 1000).toISOString();
  
  // Query recent orders
  const recentOrders = await client.fetch(`
    *[_type == "order" && userId == $userId && createdAt >= $cutoffTime && paymentMethod == $paymentMethod]
  `, { userId, cutoffTime, paymentMethod });

  // Compare items for similarity
  for (const order of recentOrders) {
    const orderItemNames = order.items?.map(item => item.foodName).sort() || [];
    const cartItemNames = cartItems.map(item => item.foodId.foodName).sort();
    
    if (JSON.stringify(orderItemNames) === JSON.stringify(cartItemNames)) {
      return { orderId: order._id, message: 'Duplicate detected' };
    }
  }
  
  return null;
}
```

## 📊 Database Schema Updates

### Order Schema (`order`)
```typescript
{
  orderIdentifier: {
    type: "string",
    validation: Rule => Rule.required().unique()
  },
  // ... other fields
}
```

### Order History Schema (`orderHistory`)
```typescript
{
  orderIdentifier: {
    type: "string", 
    validation: Rule => Rule.required().unique()
  },
  originalOrderId: {
    type: "string",
    validation: Rule => Rule.required()
  },
  // ... other fields
}
```

## 🚀 API Endpoints

### 1. Create Order (`/api/orders/create-order`)
- **Method**: POST
- **Purpose**: Creates new orders with duplicate prevention
- **Features**:
  - Generates unique order identifier
  - Checks for existing duplicates
  - Cleans up old pending orders
  - Creates records in both schemas (for COD)

### 2. Payment Verification (`/api/payment/verify-and-update`)
- **Method**: POST
- **Purpose**: Verifies online payments and updates order status
- **Features**:
  - Prevents duplicate history record creation
  - Updates existing records instead of creating new ones
  - Maintains data integrity

### 3. Cleanup Duplicates (`/api/orders/cleanup-duplicates`)
- **Method**: POST
- **Purpose**: Removes duplicate and orphaned records
- **Features**:
  - Finds exact duplicates by orderIdentifier
  - Finds time-based duplicates
  - Cleans up orphaned history records
  - Removes old pending orders

## 🧪 Testing

### Manual Testing
1. **Rapid Click Test**: Click order button multiple times quickly
2. **Payment Cancellation Test**: Cancel Razorpay payment and try again
3. **Network Interruption Test**: Disconnect internet during order processing
4. **Browser Refresh Test**: Refresh page during order processing

### Automated Testing
Run the comprehensive test script:
```bash
node scripts/test-duplicate-prevention.js
```

**Expected Results**:
- First order: ✅ Success (200)
- Immediate duplicate: ❌ Blocked (409)
- After timeout: ✅ Success (200)

## 🔍 Monitoring & Debugging

### Console Logs to Watch For
```
🛡️ Duplicate order prevention: Order already being processed
🔍 Debug: Cleaned up existing pending order
🔍 Debug: Order created successfully
🔍 Debug: Payment verification successful
```

### Sanity Studio Verification
1. Check "Order" schema for duplicate entries
2. Check "Order History" schema for duplicate entries
3. Look for orders with the same `orderIdentifier`
4. Verify that only one record exists per transaction

## ⚙️ Configuration

### Environment Variables
```bash
NODE_ENV=development  # Uses stricter time windows (2 min vs 5 min)
```

### Time Windows
- **Development**: 2 minutes (stricter for testing)
- **Production**: 5 minutes (more user-friendly)

## 🚨 Troubleshooting

### Common Issues

#### 1. Orders Still Being Duplicated
**Symptoms**: Multiple orders created despite prevention
**Solutions**:
- Check if `orderIdentifier` is being generated correctly
- Verify backend duplicate check is working
- Ensure time windows are appropriate
- Check for race conditions in payment verification

#### 2. False Positives (Legitimate Orders Blocked)
**Symptoms**: Valid orders being blocked as duplicates
**Solutions**:
- Increase time window in production
- Review item comparison logic
- Check if cleanup is removing valid pending orders

#### 3. Button Stuck in Processing State
**Symptoms**: Order button remains disabled after error
**Solutions**:
- Check error handling in `handlePlaceOrder`
- Verify `useEffect` cleanup on popup close
- Review payment cancellation handling

### Debug Steps

1. **Check Browser Console**:
   ```javascript
   // Look for these messages
   console.log('🛡️ Duplicate order prevention: Order already being processed');
   console.log('🔍 Debug: Order created successfully');
   ```

2. **Check Network Tab**:
   - Look for duplicate API calls
   - Verify HTTP status codes (200, 409, 500)
   - Check request/response timing

3. **Check Sanity Studio**:
   - Look for duplicate order records
   - Check order timestamps
   - Verify order statuses

## 📈 Performance Considerations

### Frontend Performance
- State management optimized to prevent unnecessary re-renders
- Debounced API calls to prevent rapid requests
- Efficient duplicate detection algorithms

### Backend Performance
- Indexed queries for fast duplicate detection
- Efficient cleanup processes
- Optimized database operations

## 🔒 Security Considerations

### Data Integrity
- Unique constraints at database level
- Transaction-based operations where possible
- Proper error handling and rollback mechanisms

### Payment Security
- Razorpay signature verification
- Secure payment status tracking
- Audit trail maintenance

## 📋 Maintenance

### Regular Cleanup
Run the cleanup endpoint periodically:
```bash
curl -X POST http://localhost:3000/api/orders/cleanup-duplicates
```

### Monitoring
- Monitor for duplicate orders in production
- Track cleanup statistics
- Review error logs for prevention failures

## 🎯 Expected Outcomes

With this system in place, you should achieve:

1. **Zero Duplicate Orders**: No duplicate entries in either schema
2. **Clean Data**: Proper lifecycle management of orders
3. **User Experience**: Smooth ordering process without errors
4. **Reliable Payments**: Consistent payment processing for both COD and online
5. **Audit Trail**: Complete history of all order attempts

## 📞 Support

For issues with:
- **Duplicate Prevention**: Check console logs and Sanity Studio
- **Payment Processing**: Review Razorpay integration
- **Database Schema**: Verify Sanity schema deployment
- **Testing**: Run the automated test script

---

**Last Updated**: December 2024
**Version**: 2.0
**Status**: Production Ready