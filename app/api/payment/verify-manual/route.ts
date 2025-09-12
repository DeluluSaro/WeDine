import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';

/**
 * POST /api/payment/verify-manual
 * Manual payment verification - works without Razorpay parameters
 * Use this when you want to manually confirm payments
 */
export async function POST(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const { 
      orderIds, // Array of order IDs to verify
      userId, // Optional: filter by user ID
      confirmAll = false // If true, confirm all pending orders for the user
    } = await req.json();

    const now = new Date().toISOString();
    const updatedOrders = [];

    let ordersToProcess = [];

    if (confirmAll && userId) {
      // Get all pending orders for the user
      const pendingOrders = await client.fetch(
        `*[_type == "order" && userId == $userId && status == "payment_pending"]`,
        { userId }
      );
      ordersToProcess = pendingOrders;
    } else if (orderIds && Array.isArray(orderIds)) {
      // Get specific orders
      for (const orderId of orderIds) {
        const order = await client.fetch(
          `*[_type == "order" && _id == $orderId][0]`,
          { orderId }
        );
        if (order) {
          ordersToProcess.push(order);
        }
      }
    } else {
      return NextResponse.json({ 
        error: 'Either provide orderIds array or set confirmAll=true with userId' 
      }, { status: 400 });
    }

    // Process each order
    for (const order of ordersToProcess) {
      try {
        // Check if order is already confirmed
        if (order.paymentStatus && order.status !== 'payment_pending') {
          updatedOrders.push({
            orderId: order._id,
            orderIdentifier: order.orderIdentifier,
            shopName: order.items[0]?.shopName || 'Unknown Shop',
            amount: order.total,
            status: 'already_confirmed',
            message: 'Order was already confirmed'
          });
          continue;
        }

        // Update the order with confirmed status
        const updatedOrder = await writeClient
          .patch(order._id)
          .set({
            orderStatus: true,
            status: 'ordered',
            paymentStatus: true,
            updatedAt: now,
            paymentDetails: {
              ...order.paymentDetails,
              paymentStatus: 'success',
              paidAt: now,
              verifiedAt: now,
              verificationMethod: 'manual',
              manualVerification: true
            }
          })
          .commit();

        // Create order history record
        const historyRecord = {
          _type: 'orderHistory',
          userId: order.userId,
          userEmail: order.userEmail,
          orderIdentifier: order.orderIdentifier,
          items: order.items,
          total: order.total,
          paymentMethod: order.paymentMethod,
          status: 'ordered',
          createdAt: order.createdAt,
          updatedAt: now,
          paymentStatus: true,
          originalOrderId: order._id,
          lifecycleNotes: `Order manually confirmed on ${now}`,
          paymentDetails: {
            ...order.paymentDetails,
            paymentStatus: 'success',
            paidAt: now,
            verifiedAt: now,
            verificationMethod: 'manual',
            manualVerification: true
          }
        };

        await writeClient.create(historyRecord);

        updatedOrders.push({
          orderId: order._id,
          orderIdentifier: order.orderIdentifier,
          shopName: order.items[0]?.shopName || 'Unknown Shop',
          amount: order.total,
          status: 'confirmed'
        });

      } catch (orderError) {
        console.error(`Failed to update order ${order._id}:`, orderError);
        updatedOrders.push({
          orderId: order._id,
          status: 'failed',
          error: orderError instanceof Error ? orderError.message : 'Unknown error'
        });
      }
    }

    // Calculate total amount processed
    const totalAmount = updatedOrders
      .filter(order => order.status === 'confirmed')
      .reduce((sum, order) => sum + (order.amount || 0), 0);

    return NextResponse.json({
      success: true,
      message: 'Orders manually verified and updated successfully',
      totalAmount,
      updatedOrders,
      summary: {
        totalOrders: ordersToProcess.length,
        confirmedOrders: updatedOrders.filter(o => o.status === 'confirmed').length,
        alreadyConfirmed: updatedOrders.filter(o => o.status === 'already_confirmed').length,
        failedOrders: updatedOrders.filter(o => o.status === 'failed').length
      }
    });

  } catch (error) {
    console.error('Manual payment verification error:', error);
    return NextResponse.json({ 
      error: 'Manual payment verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/payment/verify-manual
 * Get orders that can be manually verified
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status') || 'payment_pending';

    let query = `*[_type == "order" && status == $status]`;
    const params: any = { status };

    if (userId) {
      query += ` && userId == $userId`;
      params.userId = userId;
    }

    query += ` {
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
      paymentDetails,
      items[0].shopName
    } | order(createdAt desc)`;

    const orders = await client.fetch(query, params);

    return NextResponse.json({
      success: true,
      orders: orders.map(order => ({
        orderId: order._id,
        orderIdentifier: order.orderIdentifier,
        userId: order.userId,
        userEmail: order.userEmail,
        total: order.total,
        paymentMethod: order.paymentMethod,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        shopName: order.items?.[0]?.shopName || 'Unknown Shop',
        paymentDetails: order.paymentDetails,
        canBeVerified: order.status === 'payment_pending' && !order.paymentStatus
      })),
      summary: {
        totalOrders: orders.length,
        totalAmount: orders.reduce((sum, order) => sum + order.total, 0),
        canBeVerified: orders.filter(o => o.status === 'payment_pending' && !o.paymentStatus).length
      }
    });

  } catch (error) {
    console.error('Get orders for manual verification error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch orders for manual verification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
