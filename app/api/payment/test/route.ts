import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';
import { verifyRazorpaySignature, getPaymentDetails } from '@/lib/razorpay';

/**
 * POST /api/payment/test
 * Test payment verification without actual Razorpay payment
 * This is for development/testing purposes only
 */
export async function POST(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const { 
      testMode = true,
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      orderIds
    } = await req.json();

    if (!testMode) {
      return NextResponse.json({ 
        error: 'This endpoint is for testing only. Set testMode: true to use.' 
      }, { status: 400 });
    }

    // For testing, we'll skip signature verification
    console.log('🧪 TEST MODE: Skipping signature verification');

    const now = new Date().toISOString();
    const updatedOrders = [];

    // If orderIds is provided, update specific orders
    if (orderIds && Array.isArray(orderIds)) {
      for (const orderId of orderIds) {
        try {
          // Find the pending order
          const pendingOrder = await client.fetch(
            `*[_type == "order" && _id == $orderId && status == "payment_pending"][0]`,
            { orderId }
          );

          if (!pendingOrder) {
            console.warn(`Order ${orderId} not found or not in payment_pending status`);
            continue;
          }

          // Update the order with successful payment status
          const updatedOrder = await writeClient
            .patch(orderId)
            .set({
              orderStatus: true,
              status: 'ordered',
              paymentStatus: true,
              updatedAt: now,
              paymentDetails: {
                razorpayOrderId: razorpay_order_id || `test_order_${Date.now()}`,
                razorpayPaymentId: razorpay_payment_id || `test_payment_${Date.now()}`,
                razorpaySignature: razorpay_signature || 'test_signature',
                transactionId: razorpay_payment_id || `test_payment_${Date.now()}`,
                paymentStatus: 'success',
                paidAt: now,
                transferAmount: pendingOrder.paymentDetails?.transferAmount || pendingOrder.total,
                razorpayAccountId: pendingOrder.paymentDetails?.razorpayAccountId,
                testMode: true
              }
            })
            .commit();

          // Create order history record
          const historyRecord = {
            _type: 'orderHistory',
            userId: pendingOrder.userId,
            userEmail: pendingOrder.userEmail,
            orderIdentifier: pendingOrder.orderIdentifier,
            items: pendingOrder.items,
            total: pendingOrder.total,
            paymentMethod: 'online',
            status: 'ordered',
            createdAt: pendingOrder.createdAt,
            updatedAt: now,
            paymentStatus: true,
            originalOrderId: orderId,
            lifecycleNotes: 'Payment verified and order confirmed (TEST MODE)',
            paymentDetails: {
              razorpayOrderId: razorpay_order_id || `test_order_${Date.now()}`,
              razorpayPaymentId: razorpay_payment_id || `test_payment_${Date.now()}`,
              razorpaySignature: razorpay_signature || 'test_signature',
              transactionId: razorpay_payment_id || `test_payment_${Date.now()}`,
              paymentStatus: 'success',
              paidAt: now,
              transferAmount: pendingOrder.paymentDetails?.transferAmount || pendingOrder.total,
              razorpayAccountId: pendingOrder.paymentDetails?.razorpayAccountId,
              testMode: true
            }
          };

          await writeClient.create(historyRecord);

          updatedOrders.push({
            orderId: orderId,
            orderIdentifier: pendingOrder.orderIdentifier,
            shopName: pendingOrder.items[0]?.shopName || 'Unknown Shop',
            amount: pendingOrder.total,
            status: 'confirmed',
            testMode: true
          });

        } catch (orderError) {
          console.error(`Failed to update order ${orderId}:`, orderError);
          updatedOrders.push({
            orderId: orderId,
            status: 'failed',
            error: orderError instanceof Error ? orderError.message : 'Unknown error',
            testMode: true
          });
        }
      }
    } else {
      // Find all pending orders for testing
      const orders = await client.fetch(
        `*[_type == "order" && status == "payment_pending"]`
      );

      for (const order of orders) {
        try {
          // Update the order with successful payment status
          const updatedOrder = await writeClient
            .patch(order._id)
            .set({
              orderStatus: true,
              status: 'ordered',
              paymentStatus: true,
              updatedAt: now,
              paymentDetails: {
                razorpayOrderId: razorpay_order_id || `test_order_${Date.now()}`,
                razorpayPaymentId: razorpay_payment_id || `test_payment_${Date.now()}`,
                razorpaySignature: razorpay_signature || 'test_signature',
                transactionId: razorpay_payment_id || `test_payment_${Date.now()}`,
                paymentStatus: 'success',
                paidAt: now,
                transferAmount: order.paymentDetails?.transferAmount || order.total,
                razorpayAccountId: order.paymentDetails?.razorpayAccountId,
                testMode: true
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
            paymentMethod: 'online',
            status: 'ordered',
            createdAt: order.createdAt,
            updatedAt: now,
            paymentStatus: true,
            originalOrderId: order._id,
            lifecycleNotes: 'Payment verified and order confirmed (TEST MODE)',
            paymentDetails: {
              razorpayOrderId: razorpay_order_id || `test_order_${Date.now()}`,
              razorpayPaymentId: razorpay_payment_id || `test_payment_${Date.now()}`,
              razorpaySignature: razorpay_signature || 'test_signature',
              transactionId: razorpay_payment_id || `test_payment_${Date.now()}`,
              paymentStatus: 'success',
              paidAt: now,
              transferAmount: order.paymentDetails?.transferAmount || order.total,
              razorpayAccountId: order.paymentDetails?.razorpayAccountId,
              testMode: true
            }
          };

          await writeClient.create(historyRecord);

          updatedOrders.push({
            orderId: order._id,
            orderIdentifier: order.orderIdentifier,
            shopName: order.items[0]?.shopName || 'Unknown Shop',
            amount: order.total,
            status: 'confirmed',
            testMode: true
          });

        } catch (orderError) {
          console.error(`Failed to update order ${order._id}:`, orderError);
          updatedOrders.push({
            orderId: order._id,
            status: 'failed',
            error: orderError instanceof Error ? orderError.message : 'Unknown error',
            testMode: true
          });
        }
      }
    }

    // Calculate total amount processed
    const totalAmount = updatedOrders
      .filter(order => order.status === 'confirmed')
      .reduce((sum, order) => sum + (order.amount || 0), 0);

    return NextResponse.json({
      success: true,
      message: 'Payment verified and orders updated successfully (TEST MODE)',
      testMode: true,
      paymentId: razorpay_payment_id || `test_payment_${Date.now()}`,
      razorpayOrderId: razorpay_order_id || `test_order_${Date.now()}`,
      totalAmount,
      updatedOrders,
      summary: {
        totalOrders: updatedOrders.length,
        confirmedOrders: updatedOrders.filter(o => o.status === 'confirmed').length,
        failedOrders: updatedOrders.filter(o => o.status === 'failed').length
      }
    });

  } catch (error) {
    console.error('Test payment verification error:', error);
    return NextResponse.json({ 
      error: 'Test payment verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/payment/test
 * Get test payment status and pending orders
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    let query = `*[_type == "order" && status == "payment_pending"]`;
    const params: any = {};

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
      paymentDetails,
      items[0].shopName
    } | order(createdAt desc)`;

    const pendingOrders = await client.fetch(query, params);

    return NextResponse.json({
      success: true,
      testMode: true,
      pendingOrders: pendingOrders.map(order => ({
        orderId: order._id,
        orderIdentifier: order.orderIdentifier,
        userId: order.userId,
        userEmail: order.userEmail,
        total: order.total,
        paymentMethod: order.paymentMethod,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        shopName: order.items?.[0]?.shopName || 'Unknown Shop',
        paymentDetails: order.paymentDetails
      })),
      summary: {
        totalPendingOrders: pendingOrders.length,
        totalAmount: pendingOrders.reduce((sum, order) => sum + order.total, 0)
      }
    });

  } catch (error) {
    console.error('Test payment status fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch test payment status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
