import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    const { userEmail, amount, userId } = await request.json();

    if (!userEmail || !amount || amount < 10) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid user email or amount (minimum ₹10)' 
      }, { status: 400 });
    }

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `W${userId.slice(-8)}${Date.now().toString().slice(-6)}`, // Max 40 chars
      notes: {
        userEmail,
        type: 'wallet_topup',
        amount: amount.toString()
      }
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({ 
      success: true, 
      orderId: order.id,
      amount: amount,
      currency: 'INR'
    });

  } catch (error) {
    console.error('Error creating payment order:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to create payment order' 
    }, { status: 500 });
  }
}
