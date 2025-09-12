import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';

/**
 * GET /api/payment/debug
 * Debug payment system - get all payment-related data
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const orderId = searchParams.get('orderId');

    let debugInfo: any = {};

    // Get all orders
    let orderQuery = `*[_type == "order"]`;
    const orderParams: any = {};

    if (userId) {
      orderQuery += ` && userId == $userId`;
      orderParams.userId = userId;
    }

    if (orderId) {
      orderQuery += ` && _id == $orderId`;
      orderParams.orderId = orderId;
    }

    orderQuery += ` {
      _id,
      orderIdentifier,
      userId,
      userEmail,
      total,
      paymentMethod,
      status,
      paymentStatus,
      orderStatus,
      createdAt,
      updatedAt,
      expiresAt,
      isArchived,
      paymentDetails,
      items[0].shopName
    } | order(createdAt desc)`;

    const orders = await client.fetch(orderQuery, orderParams);

    // Get order history
    let historyQuery = `*[_type == "orderHistory"]`;
    const historyParams: any = {};

    if (userId) {
      historyQuery += ` && userId == $userId`;
      historyParams.userId = userId;
    }

    if (orderId) {
      historyQuery += ` && originalOrderId == $orderId`;
      historyParams.orderId = orderId;
    }

    historyQuery += ` {
      _id,
      orderIdentifier,
      userId,
      userEmail,
      total,
      paymentMethod,
      status,
      paymentStatus,
      createdAt,
      updatedAt,
      archivedAt,
      originalOrderId,
      lifecycleNotes,
      paymentDetails
    } | order(createdAt desc)`;

    const orderHistory = await client.fetch(historyQuery, historyParams);

    // Get shops with Razorpay account IDs
    const shops = await client.fetch(`
      *[_type == "shop"] {
        _id,
        shopName,
        razorpayAccountId,
        ownerMobile,
        ownerEmail,
        isActive
      }
    `);

    // Get food items with shop references
    const foodItems = await client.fetch(`
      *[_type == "foodItem"] {
        _id,
        foodName,
        price,
        shopRef->{
          _id,
          shopName,
          razorpayAccountId
        }
      }
    `);

    // Calculate statistics
    const stats = {
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === 'payment_pending').length,
      confirmedOrders: orders.filter(o => o.paymentStatus === true).length,
      codOrders: orders.filter(o => o.paymentMethod === 'cod').length,
      onlineOrders: orders.filter(o => o.paymentMethod === 'online').length,
      totalOrderHistory: orderHistory.length,
      shopsWithRazorpay: shops.filter(s => s.razorpayAccountId).length,
      shopsWithoutRazorpay: shops.filter(s => !s.razorpayAccountId).length,
      totalAmount: orders.reduce((sum, order) => sum + order.total, 0),
      pendingAmount: orders.filter(o => o.status === 'payment_pending').reduce((sum, order) => sum + order.total, 0)
    };

    // Group orders by status
    const ordersByStatus = orders.reduce((acc, order) => {
      const status = order.status || 'unknown';
      if (!acc[status]) acc[status] = [];
      acc[status].push(order);
      return acc;
    }, {} as Record<string, any[]>);

    // Group orders by payment method
    const ordersByPaymentMethod = orders.reduce((acc, order) => {
      const method = order.paymentMethod || 'unknown';
      if (!acc[method]) acc[method] = [];
      acc[method].push(order);
      return acc;
    }, {} as Record<string, any[]>);

    debugInfo = {
      timestamp: new Date().toISOString(),
      filters: { userId, orderId },
      statistics: stats,
      orders: orders.map(order => ({
        orderId: order._id,
        orderIdentifier: order.orderIdentifier,
        userId: order.userId,
        userEmail: order.userEmail,
        total: order.total,
        paymentMethod: order.paymentMethod,
        status: order.status,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        expiresAt: order.expiresAt,
        isArchived: order.isArchived,
        shopName: order.items?.[0]?.shopName || 'Unknown Shop',
        paymentDetails: order.paymentDetails
      })),
      orderHistory: orderHistory.map(history => ({
        historyId: history._id,
        orderIdentifier: history.orderIdentifier,
        userId: history.userId,
        userEmail: history.userEmail,
        total: history.total,
        paymentMethod: history.paymentMethod,
        status: history.status,
        paymentStatus: history.paymentStatus,
        createdAt: history.createdAt,
        updatedAt: history.updatedAt,
        archivedAt: history.archivedAt,
        originalOrderId: history.originalOrderId,
        lifecycleNotes: history.lifecycleNotes,
        paymentDetails: history.paymentDetails
      })),
      shops: shops.map(shop => ({
        shopId: shop._id,
        shopName: shop.shopName,
        razorpayAccountId: shop.razorpayAccountId,
        ownerMobile: shop.ownerMobile,
        ownerEmail: shop.ownerEmail,
        isActive: shop.isActive,
        hasRazorpayAccount: !!shop.razorpayAccountId
      })),
      foodItems: foodItems.map(item => ({
        foodId: item._id,
        foodName: item.foodName,
        price: item.price,
        shopId: item.shopRef?._id,
        shopName: item.shopRef?.shopName,
        shopRazorpayAccountId: item.shopRef?.razorpayAccountId
      })),
      ordersByStatus,
      ordersByPaymentMethod
    };

    return NextResponse.json({
      success: true,
      debug: debugInfo
    });

  } catch (error) {
    console.error('Payment debug error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch debug information',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/payment/debug
 * Debug actions - perform various debug operations
 */
export async function POST(req: NextRequest) {
  try {
    const { action, ...params } = await req.json();

    switch (action) {
      case 'cleanup_pending_orders':
        return await cleanupPendingOrders(params);
      
      case 'fix_order_status':
        return await fixOrderStatus(params);
      
      case 'create_test_order':
        return await createTestOrder(params);
      
      default:
        return NextResponse.json({ 
          error: 'Unknown debug action' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Payment debug action error:', error);
    return NextResponse.json({ 
      error: 'Debug action failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper functions for debug actions
async function cleanupPendingOrders(params: any) {
  const { olderThanMinutes = 30 } = params;
  
  const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();
  
  const oldPendingOrders = await client.fetch(
    `*[_type == "order" && status == "payment_pending" && createdAt < $cutoffTime]`,
    { cutoffTime }
  );

  return NextResponse.json({
    success: true,
    message: `Found ${oldPendingOrders.length} old pending orders`,
    orders: oldPendingOrders.map(order => ({
      orderId: order._id,
      orderIdentifier: order.orderIdentifier,
      createdAt: order.createdAt,
      total: order.total
    }))
  });
}

async function fixOrderStatus(params: any) {
  const { orderId, newStatus = 'ordered' } = params;
  
  if (!orderId) {
    return NextResponse.json({ 
      error: 'orderId is required' 
    }, { status: 400 });
  }

  const order = await client.fetch(
    `*[_type == "order" && _id == $orderId][0]`,
    { orderId }
  );

  if (!order) {
    return NextResponse.json({ 
      error: 'Order not found' 
    }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    message: 'Order found',
    order: {
      orderId: order._id,
      orderIdentifier: order.orderIdentifier,
      currentStatus: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      total: order.total,
      createdAt: order.createdAt
    },
    suggestedFix: {
      newStatus: newStatus,
      newPaymentStatus: true,
      newOrderStatus: true
    }
  });
}

async function createTestOrder(params: any) {
  const { userId = 'test_user_123', shopId = 'test_shop_123' } = params;
  
  const testOrder = {
    _type: 'order',
    userId: userId,
    userEmail: 'test@example.com',
    orderIdentifier: `TEST-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    items: [{
      _key: `test_item_${Date.now()}`,
      foodName: 'Test Food Item',
      quantity: 1,
      price: 100,
      shopName: 'Test Shop'
    }],
    total: 100,
    paymentMethod: 'online',
    orderStatus: false,
    status: 'payment_pending',
    paymentStatus: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    isArchived: false,
    paymentDetails: {
      razorpayOrderId: `test_order_${Date.now()}`,
      paymentStatus: 'pending',
      transferAmount: 100
    }
  };

  return NextResponse.json({
    success: true,
    message: 'Test order structure created',
    testOrder: testOrder,
    note: 'This is just a structure. Use the actual order creation APIs to create real orders.'
  });
}
