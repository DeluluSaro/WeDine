// Test Payment System Script
// Run this in your browser console or Node.js to test the payment system

// Test 1: Create COD Order
async function testCODOrder() {
  console.log('🧪 Testing COD Order Creation...');
  
  try {
    const response = await fetch('/api/orders/create-cod-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cartItems: [{
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
        }],
        userDetails: {
          userId: 'test_user_123',
          email: 'test@example.com',
          name: 'Test User',
          phone: '+1234567890',
          address: 'Test Address'
        }
      })
    });
    
    const result = await response.json();
    console.log('✅ COD Order Result:', result);
    return result;
  } catch (error) {
    console.error('❌ COD Order Error:', error);
  }
}

// Test 2: Create Online Order
async function testOnlineOrder() {
  console.log('🧪 Testing Online Order Creation...');
  
  try {
    const response = await fetch('/api/orders/create-online-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cartItems: [{
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
        }],
        userDetails: {
          userId: 'test_user_123',
          email: 'test@example.com',
          name: 'Test User',
          phone: '+1234567890',
          address: 'Test Address'
        }
      })
    });
    
    const result = await response.json();
    console.log('✅ Online Order Result:', result);
    return result;
  } catch (error) {
    console.error('❌ Online Order Error:', error);
  }
}

// Test 3: Test Payment Verification
async function testPaymentVerification(orderIds) {
  console.log('🧪 Testing Payment Verification...');
  
  try {
    const response = await fetch('/api/payment/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testMode: true,
        orderIds: orderIds
      })
    });
    
    const result = await response.json();
    console.log('✅ Payment Verification Result:', result);
    return result;
  } catch (error) {
    console.error('❌ Payment Verification Error:', error);
  }
}

// Test 4: Simple Payment Verification
async function testSimpleVerification(orderIds) {
  console.log('🧪 Testing Simple Payment Verification...');
  
  try {
    const response = await fetch('/api/payment/verify-simple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderIds: orderIds
      })
    });
    
    const result = await response.json();
    console.log('✅ Simple Verification Result:', result);
    return result;
  } catch (error) {
    console.error('❌ Simple Verification Error:', error);
  }
}

// Test 5: Get Pending Orders
async function testGetPendingOrders() {
  console.log('🧪 Testing Get Pending Orders...');
  
  try {
    const response = await fetch('/api/payment/verify-manual?userId=test_user_123');
    const result = await response.json();
    console.log('✅ Pending Orders Result:', result);
    return result;
  } catch (error) {
    console.error('❌ Get Pending Orders Error:', error);
  }
}

// Test 6: Debug Information
async function testDebugInfo() {
  console.log('🧪 Testing Debug Information...');
  
  try {
    const response = await fetch('/api/payment/debug?userId=test_user_123');
    const result = await response.json();
    console.log('✅ Debug Info Result:', result);
    return result;
  } catch (error) {
    console.error('❌ Debug Info Error:', error);
  }
}

// Complete Test Flow
async function runCompleteTest() {
  console.log('🚀 Starting Complete Payment System Test...');
  
  try {
    // Test 1: Create COD Order
    const codResult = await testCODOrder();
    
    // Test 2: Create Online Order
    const onlineResult = await testOnlineOrder();
    
    if (onlineResult && onlineResult.success) {
      // Test 3: Test Payment Verification
      const orderIds = onlineResult.orders.map(o => o.orderId);
      await testPaymentVerification(orderIds);
      
      // Test 4: Simple Payment Verification
      await testSimpleVerification(orderIds);
    }
    
    // Test 5: Get Pending Orders
    await testGetPendingOrders();
    
    // Test 6: Debug Information
    await testDebugInfo();
    
    console.log('🎉 Complete test finished!');
    
  } catch (error) {
    console.error('❌ Complete test failed:', error);
  }
}

// Individual Test Functions
window.testCODOrder = testCODOrder;
window.testOnlineOrder = testOnlineOrder;
window.testPaymentVerification = testPaymentVerification;
window.testSimpleVerification = testSimpleVerification;
window.testGetPendingOrders = testGetPendingOrders;
window.testDebugInfo = testDebugInfo;
window.runCompleteTest = runCompleteTest;

// Usage Instructions
console.log(`
🧪 Payment System Test Script Loaded!

Available test functions:
- testCODOrder() - Test COD order creation
- testOnlineOrder() - Test online order creation
- testPaymentVerification(orderIds) - Test payment verification
- testSimpleVerification(orderIds) - Test simple verification
- testGetPendingOrders() - Get pending orders
- testDebugInfo() - Get debug information
- runCompleteTest() - Run all tests

Example usage:
1. testCODOrder()
2. testOnlineOrder()
3. runCompleteTest()

Note: Make sure your server is running and environment variables are set!
`);

// Auto-run complete test if in browser
if (typeof window !== 'undefined') {
  console.log('🌐 Browser environment detected. You can run tests manually or call runCompleteTest()');
}

