import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';
import { verifyRazorpaySignature, executePaymentSplits, getPaymentDetails } from '@/lib/razorpay';
import { sanitizeOrderIdentifier } from '@/lib/orderLifecycle';

export async function POST(req: NextRequest) {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      orderItems, 
      userDetails, 
      sanitizedOrderIdentifier, 
      total, 
      splits 
    } = await req.json();

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

    const now = new Date();

    // Create order in database with successful payment status
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
      orderStatus: true,
      status: 'paid',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      paymentStatus: true,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      isArchived: false,
      paymentDetails: {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        transactionId: '', // This can be updated later if needed
        paymentStatus: 'completed',
        paidAt: now.toISOString(),
        splits: splits.map((split, index) => ({
          ...split,
          _key: `split_${Date.now()}_${index}`
        }))
      }
    });

    // Create order history record
    const historyRecord = {
      _type: 'orderHistory',
      userId: userDetails.userId,
      userEmail: userDetails.email,
      orderIdentifier: sanitizedOrderIdentifier,
      items: orderItems,
      total: total,
      paymentMethod: 'online',
      status: 'paid',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      paymentStatus: true,
      orderStatus: true,
      archivedAt: null,
      originalOrderId: order._id,
      lifecycleNotes: 'Payment verified and order completed',
      paymentDetails: {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        transactionId: '', // This can be updated later if needed
        paymentStatus: 'completed',
        paidAt: now.toISOString(),
        splits: splits
      }
    };

    await writeClient.create(historyRecord);

    return NextResponse.json({
      success: true,
      message: 'Payment verified and order created successfully',
      orderId: order._id,
      orderIdentifier: sanitizedOrderIdentifier,
      paymentId: razorpay_payment_id
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ 
      error: 'Payment verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
