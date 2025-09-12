import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';
import { verifyRazorpaySignature, getPaymentDetails } from '@/lib/razorpay';

/**
 * POST /api/payment/success
 * Handle successful payment from Razorpay
 * This endpoint is called when payment is successful
 */
export async function POST(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      orderIds, // Optional: specific order IDs
      userId // Optional: user ID for filtering
    } = await req.json();

    console.log('🎉 Payment Success Webhook Received:', {
      razorpay_order_id,
      razorpay_payment_id,
      orderIds,
      userId
    });

    // Verify the payment signature
    const isValidSignature = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValidSignature) {
      console.error('❌ Invalid payment signature');
      return NextResponse.json({ 
        error: 'Invalid payment signature' 
      }, { status: 400 });
    }

    // Get payment details from Razorpay
    const paymentDetails = await getPaymentDetails(razorpay_payment_id);
    if (!paymentDetails.success) {
      console.error('❌ Failed to fetch payment details from Razorpay');
      return NextResponse.json({ 
        error: 'Failed to fetch payment details from Razorpay' 
      }, { status: 400 });
    }

    console.log('✅ Payment verified successfully:', paymentDetails.payment);

    const now = new Date().toISOString();
    const updatedOrders = [];

    // Find orders to update
    let ordersToUpdate = [];

    if (orderIds && Array.isArray(orderIds)) {
      // Update specific orders
      for (const orderId of orderIds) {
        const order = await client.fetch(
          `*[_type == "order" && _id == $orderId][0]`,
          { orderId }
        );
        if (order) {
          ordersToUpdate.push(order);
        }
      }
    } else {
      // Find orders by Razorpay order ID
      const orders = await client.fetch(
        `*[_type == "order" && paymentDetails.razorpayOrderId == $razorpayOrderId]`,
        { razorpayOrderId: razorpay_order_id }
      );
      ordersToUpdate = orders;
    }

    if (ordersToUpdate.length === 0) {
      console.warn('⚠️ No orders found to update');
      return NextResponse.json({ 
        error: 'No orders found to update' 
      }, { status: 404 });
    }

    console.log(`📝 Found ${ordersToUpdate.length} orders to update`);

    // Update each order
    for (const order of ordersToUpdate) {
      try {
        console.log(`🔄 Updating order ${order._id}...`);

        // Update the order with successful payment status
        const updatedOrder = await writeClient
          .patch(order._id)
          .set({
            orderStatus: true,
            status: 'ordered',
            paymentStatus: true,
            updatedAt: now,
            paymentDetails: {
              ...order.paymentDetails,
              razorpayOrderId: razorpay_order_id,
              razorpayPaymentId: razorpay_payment_id,
              razorpaySignature: razorpay_signature,
              transactionId: razorpay_payment_id,
              paymentStatus: 'success',
              paidAt: now,
              verifiedAt: now,
              verificationMethod: 'razorpay_webhook'
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
          lifecycleNotes: `Payment successful and order confirmed via webhook on ${now}`,
          paymentDetails: {
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            transactionId: razorpay_payment_id,
            paymentStatus: 'success',
            paidAt: now,
            verifiedAt: now,
            verificationMethod: 'razorpay_webhook'
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

        console.log(`✅ Order ${order._id} updated successfully`);

      } catch (orderError) {
        console.error(`❌ Failed to update order ${order._id}:`, orderError);
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

    console.log(`🎉 Payment processing completed. Total amount: ₹${totalAmount}`);

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      paymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      totalAmount,
      updatedOrders,
      summary: {
        totalOrders: ordersToUpdate.length,
        confirmedOrders: updatedOrders.filter(o => o.status === 'confirmed').length,
        failedOrders: updatedOrders.filter(o => o.status === 'failed').length
      }
    });

  } catch (error) {
    console.error('❌ Payment success processing error:', error);
    return NextResponse.json({ 
      error: 'Payment processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/payment/success
 * Get payment success status and recent successful payments
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = `*[_type == "order" && paymentStatus == true]`;
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
      updatedAt,
      paymentDetails,
      items[0].shopName
    } | order(updatedAt desc) [0...${limit}]`;

    const successfulOrders = await client.fetch(query, params);

    return NextResponse.json({
      success: true,
      successfulOrders: successfulOrders.map(order => ({
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
        totalSuccessfulOrders: successfulOrders.length,
        totalAmount: successfulOrders.reduce((sum, order) => sum + order.total, 0)
      }
    });

  } catch (error) {
    console.error('Get successful payments error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch successful payments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
