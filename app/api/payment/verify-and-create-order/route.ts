import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';
import crypto from 'crypto';

interface CartItemForBackend {
  _id: string;
  quantity: number;
  price: number;
  foodId: {
    _id: string;
    foodName: string;
    shopRef: {
      _id: string;
      shopName: string;
    };
  };
}

interface UserDetails {
  userId: string;
  email?: string;
  name?: string;
  phone?: string;
  address?: string;
}

interface PaymentData {
  razorpay_payment_id?: string;
  razorpay_order_id: string;
  razorpay_signature?: string;
  isTestMode?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const { 
      paymentData, 
      cartItems, 
      userDetails 
    }: { 
      paymentData: PaymentData, 
      cartItems: CartItemForBackend[], 
      userDetails: UserDetails 
    } = await req.json();

    if (!paymentData?.razorpay_order_id || !cartItems || cartItems.length === 0 || !userDetails?.userId) {
      return NextResponse.json({ 
        error: 'Invalid request: payment data, cart items and user details are required' 
      }, { status: 400 });
    }

    console.log('🔐 Verifying payment and creating orders...');

    // For test mode, skip payment verification
    if (paymentData.isTestMode) {
      console.log('⚠️ Test mode detected - skipping payment verification');
      console.log('📋 Test payment data:', {
        orderId: paymentData.razorpay_order_id,
        paymentId: paymentData.razorpay_payment_id || 'N/A (test mode)',
        testMode: true
      });
    } else {
      // Verify payment signature for production
      if (!paymentData.razorpay_payment_id || !paymentData.razorpay_signature) {
        return NextResponse.json({ 
          error: 'Payment verification failed: missing payment details' 
        }, { status: 400 });
      }

      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(`${paymentData.razorpay_order_id}|${paymentData.razorpay_payment_id}`)
        .digest('hex');

      if (expectedSignature !== paymentData.razorpay_signature) {
        console.log('❌ Payment signature verification failed');
        return NextResponse.json({ 
          error: 'Payment verification failed: invalid signature' 
        }, { status: 400 });
      }

      console.log('✅ Payment signature verified successfully');
    }

    // --- DOUBLE-CHECK STOCK VALIDATION ---
    // Even after payment, we need to ensure stock is still available
    const itemIds = cartItems.map(item => item.foodId._id);
    const sanityQuery = `*[_type == "foodItem" && _id in $itemIds]{
      _id, 
      price, 
      foodName,
      quantity,
      "shopName": shopRef->shopName,
      "shopId": shopRef->_id
    }`;
    const sanityItems: any[] = await client.fetch(sanityQuery, { itemIds });
    const sanityItemsMap = new Map(sanityItems.map(item => [item._id, item]));

    console.log('🔍 Double-checking stock after payment...');
    const stockValidationErrors = [];
    
    for (const cartItem of cartItems) {
      const sanityItem = sanityItemsMap.get(cartItem.foodId._id);
      if (!sanityItem) {
        throw new Error(`Item ${cartItem.foodId.foodName} not found in database`);
      }
      
      // Check stock if quantity is managed
      if (sanityItem.quantity !== null && sanityItem.quantity !== undefined) {
        if (cartItem.quantity > sanityItem.quantity) {
          stockValidationErrors.push(
            `${sanityItem.foodName}: Requested ${cartItem.quantity}, but only ${sanityItem.quantity} available`
          );
        }
      }
    }
    
    // If stock became insufficient after payment, initiate refund
    if (stockValidationErrors.length > 0) {
      console.log('❌ Stock insufficient after payment - refund required:', stockValidationErrors);
      
      // TODO: Implement automatic refund logic here
      // For now, return error with refund information
      return NextResponse.json({
        error: 'Stock became insufficient after payment',
        details: stockValidationErrors,
        refundRequired: true,
        razorpayOrderId: paymentData.razorpay_order_id,
        razorpayPaymentId: paymentData.razorpay_payment_id
      }, { status: 400 });
    }
    
    console.log('✅ Stock validation passed after payment');

    // --- CREATE ORDERS AFTER SUCCESSFUL PAYMENT ---
    // Group items by shop for separate orders
    const shopOrders: { [shopId: string]: any } = {};

    for (const cartItem of cartItems) {
      const sanityItem = sanityItemsMap.get(cartItem.foodId._id);
      if (!sanityItem) {
        throw new Error(`Item ${cartItem.foodId.foodName} not found in database`);
      }
      
      const shopId = sanityItem.shopId;
      const itemTotal = sanityItem.price * cartItem.quantity;

      if (!shopOrders[shopId]) {
        shopOrders[shopId] = {
          shopId,
          shopName: sanityItem.shopName,
          items: [],
          total: 0
        };
      }

      shopOrders[shopId].items.push({
        _key: `${cartItem._id}_${Date.now()}`,
        foodName: sanityItem.foodName,
        quantity: cartItem.quantity,
        price: sanityItem.price,
        shopName: sanityItem.shopName,
      });

      shopOrders[shopId].total += itemTotal;
    }

    const createdOrders = [];
    const now = new Date().toISOString();

    // Create separate orders for each shop
    for (const [shopId, shopOrder] of Object.entries(shopOrders)) {
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const orderIdentifier = `ONLINE-${timestamp}-${shopId.slice(-6)}-${randomSuffix}`;

      // Create order document
      const orderDoc = {
        _type: 'order',
        userId: userDetails.userId,
        userEmail: userDetails.email,
        orderIdentifier,
        items: shopOrder.items,
        total: shopOrder.total,
        paymentMethod: 'online',
        orderStatus: true, // Online payment is completed
        status: 'ordered',
        paymentStatus: true,
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isArchived: false,
        // Store payment details
        paymentDetails: {
          razorpayOrderId: paymentData.razorpay_order_id,
          razorpayPaymentId: paymentData.razorpay_payment_id,
          paymentStatus: 'completed',
          isTestMode: paymentData.isTestMode || false
        },
        // Include user details for delivery
        userDetails: {
          name: userDetails.name,
          phone: userDetails.phone,
          address: userDetails.address
        }
      };

      const createdOrder = await writeClient.create(orderDoc);
      createdOrders.push({
        orderId: createdOrder._id,
        orderIdentifier,
        shopName: shopOrder.shopName,
        total: shopOrder.total,
        items: shopOrder.items
      });
    }

    const totalAmount = Object.values(shopOrders).reduce((sum, order) => sum + order.total, 0);

    // --- REDUCE STOCK for all ordered items ---
    console.log('📦 Reducing stock for paid items...');
    for (const cartItem of cartItems) {
      const sanityItem = sanityItemsMap.get(cartItem.foodId._id);
      if (sanityItem && sanityItem.quantity !== null && sanityItem.quantity !== undefined) {
        const newQuantity = Math.max(0, sanityItem.quantity - cartItem.quantity);
        console.log(`📉 Reducing ${sanityItem.foodName} stock: ${sanityItem.quantity} -> ${newQuantity}`);
        
        try {
          await writeClient
            .patch(cartItem.foodId._id)
            .set({ quantity: newQuantity })
            .commit();
        } catch (stockError) {
          console.error(`Failed to reduce stock for ${sanityItem.foodName}:`, stockError);
          // Continue with other items even if one fails
        }
      }
    }
    console.log('✅ Stock reduction completed');

    return NextResponse.json({
      success: true,
      message: 'Payment verified and orders created successfully',
      orders: createdOrders,
      totalAmount,
      orderCount: createdOrders.length,
      paymentVerified: true
    });

  } catch (error) {
    console.error('[FATAL] Payment verification and order creation failed:', error);
    return NextResponse.json({ 
      error: 'Failed to verify payment and create orders',
      details: (error as Error).message || 'An unknown server error occurred' 
    }, { status: 500 });
  }
}
