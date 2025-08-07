import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';
import { verifyRazorpaySignature, executePaymentSplits, getPaymentDetails } from '@/lib/razorpay';
import { sanitizeOrderIdentifier } from '@/lib/orderLifecycle';

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ 
        error: 'Missing payment verification parameters' 
      }, { status: 400 });
    }

    // Verify the payment signature
    const isValidSignature = verifyRazorpaySignature(
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
    const paymentDetails = await getPaymentDetails(razorpay_payment_id);
    if (!paymentDetails.success) {
      return NextResponse.json({ 
        error: 'Failed to get payment details',
        details: paymentDetails.error 
      }, { status: 500 });
    }

    // Find the order with this Razorpay order ID
    const existingOrder = await client.fetch(`
      *[_type == "order" && paymentDetails.razorpayOrderId == $razorpayOrderId][0] {
        _id,
        userId,
        userEmail,
        orderIdentifier,
        items,
        total,
        paymentMethod,
        orderStatus,
        status,
        createdAt,
        updatedAt,
        paymentStatus,
        paymentDetails
      }
    `, { razorpayOrderId: razorpay_order_id });

    if (!existingOrder) {
      return NextResponse.json({ 
        error: 'Order not found' 
      }, { status: 404 });
    }

    // Check if payment was already processed
    if (existingOrder.paymentStatus) {
      return NextResponse.json({ 
        error: 'Payment already processed',
        orderId: existingOrder._id,
        orderIdentifier: existingOrder.orderIdentifier
      }, { status: 409 });
    }

    // Get the order with payment splits for processing
    const orderWithSplits = await client.fetch(`
      *[_type == "order" && _id == $orderId][0] {
        _id,
        userId,
        userEmail,
        orderIdentifier,
        items,
        total,
        paymentMethod,
        orderStatus,
        status,
        createdAt,
        updatedAt,
        paymentStatus,
        paymentDetails
      }
    `, { orderId: existingOrder._id });

    if (!orderWithSplits) {
      return NextResponse.json({ 
        error: 'Order with splits not found' 
      }, { status: 404 });
    }

    // Check if a history record already exists to prevent duplicates
    const existingHistory = await client.fetch(`
      *[_type == "orderHistory" && (originalOrderId == $originalOrderId || orderIdentifier == $orderIdentifier)][0]
    `, { 
      originalOrderId: orderWithSplits._id,
      orderIdentifier: orderWithSplits.orderIdentifier
    });

    const now = new Date();

    if (existingHistory) {
      // Update existing history record instead of creating a new one
      console.log('🔍 Debug: Updating existing history record for payment verification');
      
      await writeClient.patch(existingHistory._id, {
        set: {
          paymentStatus: true,
          orderStatus: true,
          status: 'paid',
          updatedAt: now.toISOString(),
          'paymentDetails.razorpayPaymentId': razorpay_payment_id,
          'paymentDetails.razorpaySignature': razorpay_signature,
          'paymentDetails.transactionId': paymentDetails.transactionId,
          'paymentDetails.paymentStatus': 'completed',
          'paymentDetails.paidAt': now.toISOString(),
          lifecycleNotes: 'Payment verified and order completed'
        }
      });

      // Update the main order
      await writeClient.patch(orderWithSplits._id, {
        set: {
          paymentStatus: true,
          orderStatus: true,
          status: 'paid',
          updatedAt: now.toISOString(),
          'paymentDetails.razorpayPaymentId': razorpay_payment_id,
          'paymentDetails.razorpaySignature': razorpay_signature,
          'paymentDetails.transactionId': paymentDetails.transactionId,
          'paymentDetails.paymentStatus': 'completed',
          'paymentDetails.paidAt': now.toISOString()
        }
      });

      console.log('🔍 Debug: Payment verification successful - updated existing record');
      
      return NextResponse.json({
        success: true,
        message: 'Payment verified and order updated successfully',
        orderId: orderWithSplits._id,
        orderIdentifier: sanitizeOrderIdentifier(orderWithSplits.orderIdentifier),
        paymentId: razorpay_payment_id,
        transactionId: paymentDetails.transactionId
      });
    } else {
      // Create new history record for this payment
      console.log('🔍 Debug: Creating new history record for payment verification');
      
      const historyRecord = {
        _type: 'orderHistory',
        userId: orderWithSplits.userId,
        userEmail: orderWithSplits.userEmail,
        orderIdentifier: sanitizeOrderIdentifier(orderWithSplits.orderIdentifier),
        items: orderWithSplits.items,
        total: orderWithSplits.total,
        paymentMethod: orderWithSplits.paymentMethod,
        status: 'paid',
        createdAt: orderWithSplits.createdAt,
        updatedAt: now.toISOString(),
        paymentStatus: true,
        orderStatus: true,
        archivedAt: null,
        originalOrderId: orderWithSplits._id,
        lifecycleNotes: 'Payment verified and order completed',
        paymentDetails: {
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          transactionId: paymentDetails.transactionId,
          paymentStatus: 'completed',
          paidAt: now.toISOString(),
          splits: orderWithSplits.paymentDetails?.splits || []
        }
      };

      await writeClient.create(historyRecord);

      // Update the main order
      await writeClient.patch(orderWithSplits._id, {
        set: {
          paymentStatus: true,
          orderStatus: true,
          status: 'paid',
          updatedAt: now.toISOString(),
          'paymentDetails.razorpayPaymentId': razorpay_payment_id,
          'paymentDetails.razorpaySignature': razorpay_signature,
          'paymentDetails.transactionId': paymentDetails.transactionId,
          'paymentDetails.paymentStatus': 'completed',
          'paymentDetails.paidAt': now.toISOString()
        }
      });

      console.log('🔍 Debug: Payment verification successful - created new record');
      
      return NextResponse.json({
        success: true,
        message: 'Payment verified and order completed successfully',
        orderId: orderWithSplits._id,
        orderIdentifier: sanitizeOrderIdentifier(orderWithSplits.orderIdentifier),
        paymentId: razorpay_payment_id,
        transactionId: paymentDetails.transactionId
      });
    }

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ 
      error: 'Payment verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}