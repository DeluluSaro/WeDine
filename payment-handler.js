// Complete Payment Handler for WeDine
// This script handles the complete payment flow from order creation to verification

class PaymentHandler {
  constructor() {
    this.isProcessing = false;
    this.currentOrder = null;
  }

  // Step 1: Create COD Order
  async createCODOrder(cartItems, userDetails) {
    try {
      console.log('🛒 Creating COD order...');
      
      const response = await fetch('/api/orders/create-cod-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItems, userDetails })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ COD order created successfully:', result);
        return { success: true, orders: result.orders, totalAmount: result.totalAmount };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ COD order creation failed:', error);
      throw error;
    }
  }

  // Step 2: Create Online Order
  async createOnlineOrder(cartItems, userDetails) {
    try {
      console.log('💳 Creating online order...');
      
      const response = await fetch('/api/orders/create-online-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItems, userDetails })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Online order created successfully:', result);
        this.currentOrder = result;
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Online order creation failed:', error);
      throw error;
    }
    }

  // Step 3: Process Razorpay Payment
  async processRazorpayPayment(paymentOptions) {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔐 Initializing Razorpay payment...');
        
        const razorpay = new Razorpay(paymentOptions);
        
        // Handle payment success
        razorpay.on('payment.success', async (response) => {
          try {
            console.log('🎉 Payment successful!', response);
            
            // Process payment success
            const result = await this.handlePaymentSuccess(response);
            resolve(result);
          } catch (error) {
            console.error('❌ Payment success processing failed:', error);
            reject(error);
          }
        });
        
        // Handle payment failure
        razorpay.on('payment.failed', (response) => {
          console.error('❌ Payment failed:', response.error);
          reject(new Error(`Payment failed: ${response.error.description}`));
        });
        
        // Open payment modal
        razorpay.open();
        
      } catch (error) {
        console.error('❌ Razorpay initialization failed:', error);
        reject(error);
      }
    });
  }

  // Step 4: Handle Payment Success
  async handlePaymentSuccess(razorpayResponse) {
    try {
      console.log('🔄 Processing payment success...');
      
      if (!this.currentOrder) {
        throw new Error('No current order found');
      }
      
      // Call payment success API
      const response = await fetch('/api/payment/success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: razorpayResponse.razorpay_order_id,
          razorpay_payment_id: razorpayResponse.razorpay_payment_id,
          razorpay_signature: razorpayResponse.razorpay_signature,
          orderIds: this.currentOrder.orders.map(o => o.orderId)
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Payment processed successfully:', result);
        this.currentOrder = null; // Clear current order
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Payment success processing failed:', error);
      throw error;
    }
  }

  // Complete Payment Flow
  async processPayment(cartItems, userDetails, paymentMethod = 'online') {
    if (this.isProcessing) {
      throw new Error('Payment is already being processed');
    }
    
    this.isProcessing = true;
    
    try {
      console.log(`🚀 Starting payment process (${paymentMethod})...`);
      
      if (paymentMethod === 'cod') {
        // COD Payment Flow
        const result = await this.createCODOrder(cartItems, userDetails);
        return { success: true, method: 'cod', ...result };
        
      } else if (paymentMethod === 'online') {
        // Online Payment Flow
        const orderResult = await this.createOnlineOrder(cartItems, userDetails);
        const paymentResult = await this.processRazorpayPayment(orderResult.paymentOptions);
        return { success: true, method: 'online', ...paymentResult };
        
      } else {
        throw new Error('Invalid payment method');
      }
      
    } catch (error) {
      console.error('❌ Payment process failed:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  // Fallback: Manual Payment Verification
  async verifyPaymentManually(orderIds) {
    try {
      console.log('🔧 Manual payment verification...');
      
      const response = await fetch('/api/payment/verify-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Manual verification successful:', result);
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Manual verification failed:', error);
      throw error;
    }
  }

  // Get Payment Status
  async getPaymentStatus(userId) {
    try {
      const response = await fetch(`/api/payment/success?userId=${userId}`);
      const result = await response.json();
      
      if (result.success) {
        return result.successfulOrders;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Failed to get payment status:', error);
      throw error;
    }
  }

  // Debug Payment Issues
  async debugPayment(userId) {
    try {
      const response = await fetch(`/api/payment/debug?userId=${userId}`);
      const result = await response.json();
      
      if (result.success) {
        console.log('🔍 Payment Debug Info:', result.debug);
        return result.debug;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Debug failed:', error);
      throw error;
    }
  }
}

// Create global instance
window.PaymentHandler = PaymentHandler;
window.paymentHandler = new PaymentHandler();

// Usage Examples
console.log(`
🎯 Payment Handler Loaded!

Usage Examples:

1. COD Payment:
   paymentHandler.processPayment(cartItems, userDetails, 'cod')

2. Online Payment:
   paymentHandler.processPayment(cartItems, userDetails, 'online')

3. Manual Verification:
   paymentHandler.verifyPaymentManually(['order_id_1', 'order_id_2'])

4. Get Payment Status:
   paymentHandler.getPaymentStatus('user_id')

5. Debug Payment Issues:
   paymentHandler.debugPayment('user_id')

Example Cart Items:
const cartItems = [{
  _id: 'cart_1',
  quantity: 2,
  price: 299,
  foodId: {
    _id: 'food_1',
    foodName: 'Pizza',
    shopRef: { _id: 'shop_1', shopName: 'Test Shop' }
  }
}];

Example User Details:
const userDetails = {
  userId: 'user_123',
  email: 'user@example.com',
  name: 'John Doe',
  phone: '+1234567890',
  address: '123 Main St'
};
`);

// Test Function
window.testPayment = async function() {
  try {
    console.log('🧪 Testing Payment Handler...');
    
    const cartItems = [{
      _id: 'test_cart_1',
      quantity: 2,
      price: 299,
      foodId: {
        _id: 'test_food_1',
        foodName: 'Test Pizza',
        shopRef: { _id: 'test_shop_1', shopName: 'Test Shop' }
      }
    }];
    
    const userDetails = {
      userId: 'test_user_123',
      email: 'test@example.com',
      name: 'Test User',
      phone: '+1234567890',
      address: 'Test Address'
    };
    
    // Test COD
    console.log('Testing COD...');
    const codResult = await paymentHandler.processPayment(cartItems, userDetails, 'cod');
    console.log('COD Result:', codResult);
    
    // Test Online (will open Razorpay modal)
    console.log('Testing Online Payment...');
    const onlineResult = await paymentHandler.processPayment(cartItems, userDetails, 'online');
    console.log('Online Result:', onlineResult);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};
