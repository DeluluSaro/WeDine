import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/sanity/lib/client';

export async function POST(request: NextRequest) {
  try {
    const { orderId, shopId, amount, userEmail } = await request.json();

    if (!orderId || !shopId || !amount || !userEmail) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required data' 
      }, { status: 400 });
    }

    // Verify order exists and belongs to user
    const order = await writeClient.fetch(
      `*[_type == "order" && _id == $orderId && userEmail == $userEmail][0]`,
      { orderId, userEmail }
    );

    if (!order) {
      return NextResponse.json({ 
        success: false, 
        message: 'Order not found or unauthorized' 
      }, { status: 404 });
    }

    // Check if order is already paid
    if (order.paymentStatus) {
      return NextResponse.json({ 
        success: false, 
        message: 'Order already paid' 
      }, { status: 400 });
    }

    // Check wallet balance
    const wallet = await writeClient.fetch(
      `*[_type == "wallet" && userEmail == $userEmail][0]`,
      { userEmail }
    );

    if (!wallet) {
      return NextResponse.json({ 
        success: false, 
        message: 'Wallet not found' 
      }, { status: 404 });
    }

    if (wallet.balance < amount) {
      return NextResponse.json({ 
        success: false, 
        message: 'Insufficient wallet balance',
        currentBalance: wallet.balance,
        requiredAmount: amount
      }, { status: 400 });
    }

    // Update order with RFID payment mode
    await writeClient
      .patch(order._id)
      .set({
        rfidPaymentMode: true,
        rfidPaymentEnabledAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      })
      .commit();

    return NextResponse.json({ 
      success: true, 
      message: 'RFID payment mode enabled',
      orderId: order._id,
      amount: amount,
      shopId: shopId
    });

  } catch (error) {
    console.error('Error enabling RFID payment:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to enable RFID payment' 
    }, { status: 500 });
  }
}
