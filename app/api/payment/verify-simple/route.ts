import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';

/**
 * POST /api/payment/verify-simple
 * Simple payment verification that works without Razorpay parameters
 * This is useful for testing and manual order confirmation
 */
export async function POST(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const { 
      orderIds, // Array of order IDs to verify
      userId, // Optional: filter by user ID
      paymentMethod = 'online' // cod or online
    } = await req.json();

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ 
        error: 'orderIds array is required' 
      }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updatedOrders = [];

    // Update each order
    for (const orderId of orderIds) {
      try {
        // Find the order
        let query = `*[_type == "order" && _id == $orderId]`;
        const params: any = { orderId };

        if (userId) {
          query += ` && userId == $userId`;
          params.userId = userId;
        }

        query += `[0]`;

        const order = await client.fetch(query, params);

        if (!order) {
          console.warn(`Order ${orderId} not found`);
          updatedOrders.push({
            orderId: orderId,
            status: 'not_found',
            error: 'Order not found'
          });
          continue;
        }

        // Check if order is already confirmed
        if (order.paymentStatus && order.status !== 'payment_pending') {
          updatedOrders.push({
            orderId: orderId,
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
          .patch(orderId)
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
              verificationMethod: 'manual'
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
          originalOrderId: orderId,
          lifecycleNotes: `Order confirmed via simple verification on ${now}`,
          paymentDetails: {
            ...order.paymentDetails,
            paymentStatus: 'success',
            paidAt: now,
            verifiedAt: now,
            verificationMethod: 'manual'
          }
        };

        await writeClient.create(historyRecord);

        updatedOrders.push({
          orderId: orderId,
          orderIdentifier: order.orderIdentifier,
          shopName: order.items[0]?.shopName || 'Unknown Shop',
          amount: order.total,
          status: 'confirmed'
        });

      } catch (orderError) {
        console.error(`Failed to update order ${orderId}:`, orderError);
        updatedOrders.push({
          orderId: orderId,
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
      message: 'Orders verified and updated successfully',
      totalAmount,
      updatedOrders,
      summary: {
        totalOrders: orderIds.length,
        confirmedOrders: updatedOrders.filter(o => o.status === 'confirmed').length,
        alreadyConfirmed: updatedOrders.filter(o => o.status === 'already_confirmed').length,
        failedOrders: updatedOrders.filter(o => o.status === 'failed').length,
        notFound: updatedOrders.filter(o => o.status === 'not_found').length
      }
    });

  } catch (error) {
    console.error('Simple payment verification error:', error);
    return NextResponse.json({ 
      error: 'Payment verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/payment/verify-simple
 * Get pending orders that can be verified
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
        paymentDetails: order.paymentDetails
      })),
      summary: {
        totalOrders: orders.length,
        totalAmount: orders.reduce((sum, order) => sum + order.total, 0)
      }
    });

  } catch (error) {
    console.error('Get pending orders error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch pending orders',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
