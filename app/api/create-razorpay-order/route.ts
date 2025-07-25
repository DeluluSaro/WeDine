import { NextRequest, NextResponse } from 'next/server';
import { razorpay } from '@/lib/razorpay';

console.log('API: create-razorpay-order called');

export async function POST(req: NextRequest) {
  try {
    const { amount, currency = 'INR', receipt } = await req.json();
    if (!amount || !receipt) {
      return NextResponse.json({ error: 'Missing amount or receipt' }, { status: 400 });
    }
    const options = {
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency,
      receipt,
      payment_capture: 1,
    };
    const order = await razorpay.orders.create(options);
    return NextResponse.json({ order });
  } catch (error: any) {
    console.error('Razorpay order creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 