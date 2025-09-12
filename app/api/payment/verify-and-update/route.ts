import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';
import { verifyRazorpaySignature, getPaymentDetails } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      orderIds // Array of order IDs that were created during order creation
    } = await req.json();

    // Check if we have the required parameters for signature verification
    const hasSignatureParams = razorpay_order_id && razorpay_payment_id && razorpay_signature;
    
    if (!hasSignatureParams && !orderIds) {
      return NextResponse.json({ 
        error: 'Missing payment verification parameters. Either provide razorpay_order_id, razorpay_payment_id, and razorpay_signature, or provide orderIds for manual verification.' 
      }, { status: 400 });
    }

    // Verify the payment signature only if we have signature parameters
    let isValidSignature = true;
    let paymentDetails = null;

    if (hasSignatureParams) {
      isValidSignature = verifyRazorpaySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (!isValidSignature) {
        return NextResponse.json({ 
          error: 'Invalid payment signature' 
        }, { status: 400 });
      }

      // Get payment details from Razorpay
      paymentDetails = await getPaymentDetails(razorpay_payment_id);
      if (!paymentDetails.success) {
        return NextResponse.json({ 
          error: 'Failed to fetch payment details from Razorpay' 
        }, { status: 400 });
      }
    }

    const now = new Date().toISOString();
    const updatedOrders = [];

    // If orderIds is provided, update specific orders
    if (orderIds && Array.isArray(orderIds)) {
      // Update each order that was part of this payment
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
              status: 'ordered', // Change from payment_pending to ordered
              paymentStatus: true,
              updatedAt: now,
              paymentDetails: {
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                transactionId: razorpay_payment_id,
                paymentStatus: 'success',
                paidAt: now,
                transferAmount: pendingOrder.paymentDetails?.transferAmount || pendingOrder.total,
                razorpayAccountId: pendingOrder.paymentDetails?.razorpayAccountId
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
            lifecycleNotes: 'Payment verified and order confirmed',
            paymentDetails: {
              razorpayOrderId: razorpay_order_id,
              razorpayPaymentId: razorpay_payment_id,
              razorpaySignature: razorpay_signature,
              transactionId: razorpay_payment_id,
              paymentStatus: 'success',
              paidAt: now,
              transferAmount: pendingOrder.paymentDetails?.transferAmount || pendingOrder.total,
              razorpayAccountId: pendingOrder.paymentDetails?.razorpayAccountId
            }
          };

          await writeClient.create(historyRecord);

          updatedOrders.push({
            orderId: orderId,
            orderIdentifier: pendingOrder.orderIdentifier,
            shopName: pendingOrder.items[0]?.shopName || 'Unknown Shop',
            amount: pendingOrder.total,
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
    } else {
      // If no specific orderIds provided, find orders by Razorpay order ID
      const orders = await client.fetch(
        `*[_type == "order" && paymentDetails.razorpayOrderId == $razorpayOrderId && status == "payment_pending"]`,
        { razorpayOrderId: razorpay_order_id }
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
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                transactionId: razorpay_payment_id,
                paymentStatus: 'success',
                paidAt: now,
                transferAmount: order.paymentDetails?.transferAmount || order.total,
                razorpayAccountId: order.paymentDetails?.razorpayAccountId
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
            lifecycleNotes: 'Payment verified and order confirmed',
            paymentDetails: {
              razorpayOrderId: razorpay_order_id,
              razorpayPaymentId: razorpay_payment_id,
              razorpaySignature: razorpay_signature,
              transactionId: razorpay_payment_id,
              paymentStatus: 'success',
              paidAt: now,
              transferAmount: order.paymentDetails?.transferAmount || order.total,
              razorpayAccountId: order.paymentDetails?.razorpayAccountId
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
    }

    // Calculate total amount processed
    const totalAmount = updatedOrders
      .filter(order => order.status === 'confirmed')
      .reduce((sum, order) => sum + (order.amount || 0), 0);

    return NextResponse.json({
      success: true,
      message: 'Payment verified and orders updated successfully',
      paymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      totalAmount,
      updatedOrders,
      summary: {
        totalOrders: updatedOrders.length,
        confirmedOrders: updatedOrders.filter(o => o.status === 'confirmed').length,
        failedOrders: updatedOrders.filter(o => o.status === 'failed').length
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ 
      error: 'Payment verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
