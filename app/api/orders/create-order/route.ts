import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';
import { calculateTotalAmount, calculatePaymentSplits, createRazorpayOrder } from '@/lib/razorpay';
import { generateUniqueOrderIdentifier, findPendingOrdersToCleanup, validateOrderData, sanitizeOrderIdentifier } from '@/lib/orderLifecycle';

interface CreateOrderRequest {
  cartItems: CartItem[];
  paymentMethod: 'cod' | 'online';
  userDetails: {
    userId: string;
    email?: string;
    name?: string;
    phone?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const { cartItems, paymentMethod, userDetails }: CreateOrderRequest = await req.json();

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: 'Cart items are required' }, { status: 400 });
    }

    if (!userDetails?.userId) {
      return NextResponse.json({ error: 'User details are required' }, { status: 400 });
    }

    // Generate unique order identifier
    const orderIdentifier = generateUniqueOrderIdentifier(userDetails.userId, cartItems, paymentMethod);
    const sanitizedOrderIdentifier = sanitizeOrderIdentifier(orderIdentifier);

    // Enhanced duplicate prevention - check for similar orders within a time window
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    const cutoffTime = new Date(Date.now() - timeWindow).toISOString();
    
    const existingOrders = await client.fetch(`
      *[_type == "order" && userId == $userId && createdAt >= $cutoffTime] {
        _id,
        orderIdentifier,
        createdAt,
        items,
        paymentMethod
      }
    `, { 
      userId: userDetails.userId, 
      cutoffTime 
    });

    // Check for exact identifier match only
    const exactMatch = existingOrders.find((order: any) => order.orderIdentifier === sanitizedOrderIdentifier);
    if (exactMatch) {
      console.warn('🔍 Debug: Order with exact identifier already exists:', exactMatch);
      return NextResponse.json({ 
        error: 'Order already exists with this identifier',
        orderId: exactMatch._id,
        orderIdentifier: exactMatch.orderIdentifier
      }, { status: 409 });
    }

    // Removed the similar order check as it was causing false positives
    // Users should be able to place multiple orders with similar items

    // Clean up old pending orders
    const pendingOrdersToCleanup = await findPendingOrdersToCleanup(userDetails.userId);
    for (const pendingOrder of pendingOrdersToCleanup) {
      try {
        await writeClient.delete(pendingOrder._id);
        console.log('🔍 Debug: Cleaned up old pending order:', pendingOrder._id);
      } catch (error) {
        console.warn('🔍 Debug: Failed to clean up pending order:', pendingOrder._id, error);
      }
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Prepare order items with proper structure
    const orderItems = cartItems.map((item, index) => ({
      foodName: item.foodId.foodName,
      quantity: item.quantity,
      price: item.price,
      shopName: item.foodId.shopRef.shopName,
      paymentMobile: item.foodId.shopRef.paymentMobile || 
        (item.foodId.shopRef.ownerMobile ? item.foodId.shopRef.ownerMobile.replace(/-/g, '') : ''),
      _key: `item_${Date.now()}_${index}`
    }));

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const { tax, deliveryFee, total } = calculateTotalAmount(subtotal);

    // Calculate payment splits for multi-vendor
    const paymentSplits = calculatePaymentSplits(cartItems);

    if (paymentMethod === 'online') {
      // Create Razorpay order
      const razorpayResult = await createRazorpayOrder(total, 'INR', {
        orderType: 'multi-vendor',
        totalShops: paymentSplits.length,
        userId: userDetails.userId
      });

      if (!razorpayResult.success) {
        return NextResponse.json({ 
          error: 'Failed to create Razorpay order', 
          details: razorpayResult.error 
        }, { status: 500 });
      }

      // Create order in database with pending payment status
      const order = await writeClient.create({
        _type: 'order',
        userId: userDetails.userId,
        userEmail: userDetails.email,
        orderIdentifier: sanitizedOrderIdentifier,
        items: orderItems.map((item, index) => ({
          ...item,
          _key: `item_${Date.now()}_${index}`
        })),
        total: total,
        paymentMethod: 'online',
        orderStatus: false, // Will be updated after successful payment
        status: 'ordered',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        paymentStatus: false, // Will be updated after successful payment
        expiresAt: expiresAt.toISOString(),
        isArchived: false,
        paymentDetails: {
          razorpayOrderId: razorpayResult.orderId,
          razorpayPaymentId: '', // Will be filled after payment
          razorpaySignature: '', // Will be filled after payment
          transactionId: '', // Will be filled after payment
          paymentStatus: 'pending',
          paidAt: null, // Will be filled after payment
          splits: paymentSplits.map((split, index) => ({
            ...split,
            _key: `split_${Date.now()}_${index}`
          }))
        }
      });

      // Note: History record will be created during payment verification
      // to ensure proper lifecycle management

      return NextResponse.json({
        success: true,
        orderId: razorpayResult.orderId,
        orderDbId: order._id,
        orderIdentifier: sanitizedOrderIdentifier,
        amount: total,
        splits: paymentSplits,
        message: 'Order created successfully. Proceed with payment.'
      });

    } else if (paymentMethod === 'cod') {
      // Create COD order - only in order schema, not in orderHistory
      const order = await writeClient.create({
        _type: 'order',
        userId: userDetails.userId,
        userEmail: userDetails.email,
        orderIdentifier: sanitizedOrderIdentifier,
        items: orderItems.map((item, index) => ({
          ...item,
          _key: `item_${Date.now()}_${index}`
        })),
        total: total,
        paymentMethod: 'cod',
        orderStatus: false, // COD orders are always unpaid initially
        status: 'ordered',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        paymentStatus: false, // COD orders are unpaid until delivery
        expiresAt: expiresAt.toISOString(),
        isArchived: false,
        paymentDetails: {
          razorpayOrderId: '',
          razorpayPaymentId: '',
          razorpaySignature: '',
          transactionId: '',
          paymentStatus: 'pending',
          paidAt: null,
          splits: paymentSplits.map((split, index) => ({
            ...split,
            _key: `split_${Date.now()}_${index}`
          }))
        }
      });

      // Note: History record will be created during order lifecycle cleanup
      // to ensure proper lifecycle management without duplication

      return NextResponse.json({
        success: true,
        orderId: order._id,
        orderDbId: order._id,
        orderIdentifier: sanitizedOrderIdentifier,
        amount: total,
        message: 'COD order created successfully.'
      });
    }

    return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ 
      error: 'Failed to create order', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}