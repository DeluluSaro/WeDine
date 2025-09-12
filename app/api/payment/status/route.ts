import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';
import { getPaymentDetails } from '@/lib/razorpay';

/**
 * GET /api/payment/status
 * Gets payment status for orders
 * 
 * Query Params:
 * - orderId: Order ID to check status
 * - paymentId: Razorpay payment ID to check status
 * - userId: User ID to get all their payment statuses
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const paymentId = searchParams.get('paymentId');
    const userId = searchParams.get('userId');

    if (!orderId && !paymentId && !userId) {
      return NextResponse.json({ 
        error: 'At least one parameter is required: orderId, paymentId, or userId' 
      }, { status: 400 });
    }

    let query = `*[_type == "order"`;
    const params: any = {};

    if (orderId) {
      query += ` && _id == $orderId`;
      params.orderId = orderId;
    } else if (paymentId) {
      query += ` && paymentDetails.razorpayPaymentId == $paymentId`;
      params.paymentId = paymentId;
    } else if (userId) {
      query += ` && userId == $userId`;
      params.userId = userId;
    }

    query += `] {
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
      paymentDetails,
      items[0].shopName
    } | order(createdAt desc)`;

    const orders = await client.fetch(query, params);

    // If we have a specific payment ID, also fetch details from Razorpay
    let razorpayPaymentDetails = null;
    if (paymentId) {
      const paymentDetails = await getPaymentDetails(paymentId);
      if (paymentDetails.success) {
        razorpayPaymentDetails = paymentDetails.payment;
      }
    }

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
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        shopName: order.items?.[0]?.shopName || 'Unknown Shop',
        paymentDetails: order.paymentDetails
      })),
      razorpayPaymentDetails,
      summary: {
        totalOrders: orders.length,
        paidOrders: orders.filter(o => o.paymentStatus).length,
        pendingOrders: orders.filter(o => !o.paymentStatus && o.paymentMethod === 'online').length,
        codOrders: orders.filter(o => o.paymentMethod === 'cod').length
      }
    });

  } catch (error) {
    console.error('Payment status fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch payment status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/payment/status
 * Updates payment status for orders (for webhook handling)
 */
export async function POST(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const body = await req.json();
    const { 
      paymentId, 
      status, 
      orderId, 
      razorpayOrderId,
      webhookSignature 
    } = body;

    if (!paymentId || !status) {
      return NextResponse.json({ 
        error: 'Payment ID and status are required' 
      }, { status: 400 });
    }

    // In production, verify webhook signature here
    // const isValidWebhook = verifyWebhookSignature(body, webhookSignature);
    // if (!isValidWebhook) {
    //   return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    // }

    const now = new Date().toISOString();
    const updatedOrders = [];

    // Find orders with this payment ID
    const orders = await client.fetch(
      `*[_type == "order" && paymentDetails.razorpayPaymentId == $paymentId]`,
      { paymentId }
    );

    for (const order of orders) {
      try {
        let newStatus = order.status;
        let newPaymentStatus = order.paymentStatus;

        // Update status based on payment status
        switch (status.toLowerCase()) {
          case 'captured':
          case 'success':
            newStatus = 'ordered';
            newPaymentStatus = true;
            break;
          case 'failed':
            newStatus = 'payment_failed';
            newPaymentStatus = false;
            break;
          case 'refunded':
            newStatus = 'refunded';
            newPaymentStatus = false;
            break;
          default:
            newStatus = order.status;
        }

        // Update the order
        const updatedOrder = await client
          .patch(order._id)
          .set({
            status: newStatus,
            paymentStatus: newPaymentStatus,
            orderStatus: newPaymentStatus,
            updatedAt: now,
            'paymentDetails.paymentStatus': status.toLowerCase(),
            'paymentDetails.updatedAt': now
          })
          .commit();

        updatedOrders.push({
          orderId: order._id,
          orderIdentifier: order.orderIdentifier,
          oldStatus: order.status,
          newStatus: newStatus,
          paymentStatus: newPaymentStatus
        });

        // Create history record for status change
        if (newStatus !== order.status) {
          await client.create({
            _type: 'orderHistory',
            userId: order.userId,
            userEmail: order.userEmail,
            orderIdentifier: order.orderIdentifier,
            items: order.items,
            total: order.total,
            paymentMethod: order.paymentMethod,
            status: newStatus,
            createdAt: order.createdAt,
            updatedAt: now,
            paymentStatus: newPaymentStatus,
            originalOrderId: order._id,
            lifecycleNotes: `Status updated via webhook: ${order.status} → ${newStatus}`,
            paymentDetails: order.paymentDetails
          });
        }

      } catch (orderError) {
        console.error(`Failed to update order ${order._id}:`, orderError);
        updatedOrders.push({
          orderId: order._id,
          error: orderError instanceof Error ? orderError.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment status updated successfully',
      paymentId,
      status,
      updatedOrders,
      summary: {
        totalOrders: orders.length,
        updatedOrders: updatedOrders.filter(o => !o.error).length,
        failedUpdates: updatedOrders.filter(o => o.error).length
      }
    });

  } catch (error) {
    console.error('Payment status update error:', error);
    return NextResponse.json({ 
      error: 'Failed to update payment status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
