import Razorpay from 'razorpay';
import crypto from 'crypto';

// Check if required environment variables are set
const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  console.warn('⚠️ Razorpay environment variables are not set. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env.local file');
}

// Initialize Razorpay only if environment variables are available
const razorpay = keyId && keySecret ? new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
}) : null;

export interface PaymentSplit {
  shopId: string;
  shopName: string;
  ownerMobile: string;
  splitAmount: number;
  transferId?: string;
  transferStatus: 'pending' | 'completed' | 'failed';
  transferredAt?: Date;
}

export interface CartItem {
  _id: string;
  foodId: {
    _id: string;
    foodName: string;
    price: number;
    shopRef: {
      _id: string;
      shopName: string;
      ownerMobile?: string;
      razorpayAccountId?: string;
    };
  };
  quantity: number;
  price: number;
}

/**
 * Calculate payment splits for multi-vendor orders
 */
export function calculatePaymentSplits(cartItems: CartItem[]): PaymentSplit[] {
  const shopSplits: { [key: string]: PaymentSplit } = {};
  
  cartItems.forEach(item => {
    const shopId = item.foodId.shopRef._id;
    const itemTotal = item.price * item.quantity;
    
    if (!shopSplits[shopId]) {
      shopSplits[shopId] = {
        shopId: shopId,
        shopName: item.foodId.shopRef.shopName,
        ownerMobile: item.foodId.shopRef.ownerMobile || '',
        splitAmount: 0,
        transferStatus: 'pending'
      };
    }
    
    shopSplits[shopId].splitAmount += itemTotal;
  });
  
  return Object.values(shopSplits);
}

/**
 * Create Razorpay order
 */
export async function createRazorpayOrder(amount: number, currency: string = 'INR', notes?: any) {
  if (!razorpay) {
    return {
      success: false,
      error: 'Razorpay client not initialized. Environment variables not set.'
    };
  }

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency,
      notes: notes || {}
    });
    
    return {
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    };
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Verify Razorpay payment signature
 */
export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  try {
    if (!keySecret) {
      console.error('RAZORPAY_KEY_SECRET not set. Cannot verify signature.');
      return false;
    }

    const text = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');
    
    return expectedSignature === signature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

/**
 * Execute payment splits to shop owners
 */
export async function executePaymentSplits(paymentId: string, splits: PaymentSplit[]): Promise<PaymentSplit[]> {
  if (!razorpay) {
    console.error('Razorpay client not initialized. Cannot execute payment splits.');
    return splits.map(split => ({
      ...split,
      transferStatus: 'failed',
      transferredAt: new Date()
    }));
  }

  const transferResults: PaymentSplit[] = [];
  
  for (const split of splits) {
    try {
      // Skip if no owner mobile or split amount is 0
      if (!split.ownerMobile || split.splitAmount <= 0) {
        transferResults.push({
          ...split,
          transferStatus: 'failed',
          transferredAt: new Date()
        });
        continue;
      }

      // Create transfer to shop owner
      const transfer = await razorpay.transfers.create({
        account: split.ownerMobile, // Use mobile as account identifier
        amount: Math.round(split.splitAmount * 100), // Convert to paise
        currency: 'INR',
        notes: {
          shopId: split.shopId,
          shopName: split.shopName,
          ownerMobile: split.ownerMobile,
          originalPaymentId: paymentId,
          transferType: 'vendor_payment'
        }
      });
      
      transferResults.push({
        ...split,
        transferId: transfer.id,
        transferStatus: 'completed',
        transferredAt: new Date()
      });
      
      console.log(`Transfer completed for shop ${split.shopName}: ${transfer.id}`);
      
    } catch (error) {
      console.error(`Transfer failed for shop ${split.shopName}:`, error);
      transferResults.push({
        ...split,
        transferStatus: 'failed',
        transferredAt: new Date()
      });
    }
  }
  
  return transferResults;
}

/**
 * Get payment details from Razorpay
 */
export async function getPaymentDetails(paymentId: string) {
  if (!razorpay) {
    return {
      success: false,
      error: 'Razorpay client not initialized. Cannot fetch payment details.'
    };
  }

  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return {
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        captured: payment.captured,
        description: payment.description,
        email: payment.email,
        contact: payment.contact,
        created_at: payment.created_at
      }
    };
  } catch (error) {
    console.error('Error fetching payment details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Refund payment
 */
export async function refundPayment(paymentId: string, amount?: number, notes?: string) {
  if (!razorpay) {
    return {
      success: false,
      error: 'Razorpay client not initialized. Cannot refund payment.'
    };
  }

  try {
    const refundData: any = {
      payment_id: paymentId,
      notes: notes || { reason: 'Customer request' }
    };
    
    if (amount) {
      refundData.amount = Math.round(amount * 100); // Convert to paise
    }
    
    const refund = await razorpay.payments.refund(refundData);
    
    return {
      success: true,
      refund: {
        id: refund.id,
        payment_id: refund.payment_id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
        created_at: refund.created_at
      }
    };
  } catch (error) {
    console.error('Error refunding payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate client-side payment options
 */
export function generatePaymentOptions(orderId: string, amount: number, currency: string = 'INR', userDetails?: any) {
  if (!keyId) {
    console.warn('⚠️ RAZORPAY_KEY_ID not set. Cannot generate payment options.');
    return null;
  }

  return {
    key: keyId,
    amount: Math.round(amount * 100), // Convert to paise
    currency: currency,
    order_id: orderId,
    name: 'WeDine',
    description: 'Food delivery payment',
    image: '/logo.png', // Add your logo path
    prefill: {
      name: userDetails?.name || '',
      email: userDetails?.email || '',
      contact: userDetails?.phone || ''
    },
    notes: {
      orderType: 'food_delivery',
      platform: 'WeDine'
    },
    theme: {
      color: '#F59E0B' // Yellow theme
    }
  };
}

/**
 * Calculate total amount with tax and delivery
 */
export function calculateTotalAmount(subtotal: number, taxRate: number = 0.05, deliveryThreshold: number = 500, deliveryFee: number = 50): {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
} {
  const tax = subtotal * taxRate;
  const delivery = subtotal > deliveryThreshold ? 0 : deliveryFee;
  const total = subtotal + tax + delivery;
  
  return {
    subtotal,
    tax,
    deliveryFee: delivery,
    total
  };
}

export default razorpay;