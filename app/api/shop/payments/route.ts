import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId') || 'SHOP_001';

    // Fetch payments for the shop
    const query = `
      *[_type == "razorpayPayment" && shopId == $shopId] | order(createdAt desc) {
        _id,
        orderId,
        amount,
        razorpayOrderId,
        status,
        createdAt,
        paidAt
      }
    `;

    const payments = await client.fetch(query, { shopId });

    return NextResponse.json({
      success: true,
      payments
    });

  } catch (error) {
    console.error('Error fetching shop payments:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch payments'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orderId, amount, shopId, deviceId, razorpayOrderId } = await request.json();

    if (!orderId || !amount || !shopId || !razorpayOrderId) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields'
      }, { status: 400 });
    }

    // Create payment record
    const paymentRecord = {
      _type: 'razorpayPayment',
      orderId,
      amount,
      shopId,
      deviceId,
      razorpayOrderId,
      status: 'created',
      createdAt: new Date().toISOString()
    };

    const result = await client.create(paymentRecord);

    return NextResponse.json({
      success: true,
      payment: result
    });

  } catch (error) {
    console.error('Error creating payment record:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create payment record'
    }, { status: 500 });
  }
}
