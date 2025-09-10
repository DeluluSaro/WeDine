import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';
import { calculateTotalAmount, createRazorpayOrder, calculatePaymentSplits } from '@/lib/razorpay';
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

    // Generate unique order identifier with better entropy
    const orderIdentifier = generateUniqueOrderIdentifier(userDetails.userId, cartItems, paymentMethod);
    const sanitizedOrderIdentifier = sanitizeOrderIdentifier(orderIdentifier);

    // Enhanced duplicate prevention with stricter checks
    const timeWindow = 2 * 60 * 1000; // Reduced to 2 minutes for stricter duplicate detection
    const cutoffTime = new Date(Date.now() - timeWindow).toISOString();
    
    // Check for any recent orders from this user with similar items
    const existingOrders = await client.fetch(`
      *[_type == "order" && userId == $userId && createdAt >= $cutoffTime] {
        _id,
        orderIdentifier,
        createdAt,
        items,
        paymentMethod,
        total
      }
    `, { 
      userId: userDetails.userId, 
      cutoffTime 
    });

    // Check for exact identifier match
    const exactMatch = existingOrders.find((order: any) => order.orderIdentifier === sanitizedOrderIdentifier);
    if (exactMatch) {
      console.warn('🔍 Debug: Order with exact identifier already exists:', exactMatch);
      return NextResponse.json({ 
        error: 'Order already exists with this identifier',
        orderId: exactMatch._id,
        orderIdentifier: exactMatch.orderIdentifier
      }, { status: 409 });
    }

    // Check for similar orders with same items and total amount (additional protection)
    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const similarOrder = existingOrders.find((order: any) => {
      // Check if items are similar (same food names and quantities)
      if (order.items && order.items.length === cartItems.length) {
        const orderItems = order.items.map((item: any) => `${item.foodName}-${item.quantity}`).sort();
        const cartItemsStr = cartItems.map(item => `${item.foodId.foodName}-${item.quantity}`).sort();
        
        return JSON.stringify(orderItems) === JSON.stringify(cartItemsStr) && 
               Math.abs(order.total - cartTotal) < 1; // Allow small floating point differences
      }
      return false;
    });

    if (similarOrder) {
      console.warn('🔍 Debug: Similar order already exists:', similarOrder);
      return NextResponse.json({ 
        error: 'A similar order was recently placed. Please check your orders.',
        orderId: similarOrder._id,
        orderIdentifier: similarOrder.orderIdentifier
      }, { status: 409 });
    }

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

    // Reduce stock for all items in the order
    console.log('🔍 Debug: Starting stock reduction for order items');
    const stockReductionItems = cartItems.map(item => ({
      foodId: item.foodId._id,
      quantity: item.quantity
    }));

    try {
      const stockResponse = await fetch(`${req.nextUrl.origin}/api/products/reduce-stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: stockReductionItems })
      });

      if (!stockResponse.ok) {
        const stockError = await stockResponse.json();
        console.error('🔍 Debug: Stock reduction failed:', stockError);
        // IMPORTANT: Stop order creation if stock reduction fails
        return NextResponse.json({ 
          error: 'One or more items in your cart are out of stock or have limited quantity.', 
          details: stockError.errors 
        }, { status: 400 });
      }

      const stockResult = await stockResponse.json();
      console.log('🔍 Debug: Stock reduction successful:', stockResult);
    } catch (error) {
      console.error('🔍 Debug: Error during stock reduction:', error);
      return NextResponse.json({ 
        error: 'Failed to reduce stock', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
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

      return NextResponse.json({
        success: true,
        orderId: razorpayResult.orderId,
        amount: total,
        splits: paymentSplits,
        orderItems: orderItems,
        sanitizedOrderIdentifier: sanitizedOrderIdentifier,
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
