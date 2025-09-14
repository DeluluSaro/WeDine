import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    const { orderId, amount, shopId, deviceId } = await request.json();

    if (!orderId || !amount || !shopId) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields'
      }, { status: 400 });
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      receipt: `order_${orderId}_${Date.now()}`,
      notes: {
        orderId,
        shopId,
        deviceId,
        paymentType: 'rfid_fallback'
      }
    });

    return NextResponse.json({
      success: true,
      paymentId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderId: razorpayOrder.id,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      paymentLink: `https://your-domain.com/payment/razorpay/${razorpayOrder.id}`
    });

  } catch (error) {
    console.error('Razorpay payment creation error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create payment'
    }, { status: 500 });
  }
}
