import { NextRequest, NextResponse } from 'next/server';
import { verifyRFIDCard, updateRFIDVerification } from '@/lib/firebase-rfid';
import { writeClient } from '@/sanity/lib/client';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    const { rfidCardId, orderId, totalAmount, shopName } = await request.json();

    // Validate required fields
    if (!rfidCardId || !orderId || !totalAmount || !shopName) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: rfidCardId, orderId, totalAmount, shopName'
      }, { status: 400 });
    }

    // Verify RFID card exists in Firebase
    const rfidVerification = await verifyRFIDCard(rfidCardId);

    if (!rfidVerification.exists) {
      return NextResponse.json({
        success: false,
        message: 'RFID card not found or not registered'
      }, { status: 404 });
    }

    // Get RFID card details from Sanity
    const rfidCard = await writeClient.fetch(
      `*[_type == "rfidCard" && cardId == $cardId && isActive == true && isBlocked != true][0]`,
      { cardId: rfidCardId }
    );

    if (!rfidCard) {
      return NextResponse.json({
        success: false,
        message: 'RFID card not found in database or inactive'
      }, { status: 404 });
    }

    // Get wallet
    const wallet = await writeClient.fetch(
      `*[_type == "wallet" && userEmail == $userEmail][0]`,
      { userEmail: rfidCard.userEmail }
    );

    if (!wallet) {
      return NextResponse.json({
        success: false,
        message: 'Wallet not found for this card'
      }, { status: 404 });
    }

    // Check balance
    if (wallet.balance < totalAmount) {
      return NextResponse.json({
        success: false,
        message: 'Insufficient wallet balance',
        currentBalance: wallet.balance,
        requiredAmount: totalAmount
      }, { status: 400 });
    }

    // Get order
    const order = await writeClient.fetch(
      `*[_type == "order" && _id == $orderId][0]`,
      { orderId }
    );

    if (!order) {
      return NextResponse.json({
        success: false,
        message: 'Order not found'
      }, { status: 404 });
    }

    if (order.paymentStatus) {
      return NextResponse.json({
        success: false,
        message: 'Order already paid'
      }, { status: 400 });
    }

    // Get shop details
    const shop = await writeClient.fetch(
      `*[_type == "shop" && shopName == $shopName][0]`,
      { shopName }
    );

    if (!shop) {
      return NextResponse.json({
        success: false,
        message: 'Shop not found'
      }, { status: 404 });
    }

    // Create Razorpay payment
    const paymentOptions = {
      amount: Math.round(totalAmount * 100), // Convert to paise
      currency: 'INR',
      receipt: `rfid_${orderId}_${Date.now()}`,
      notes: {
        orderId: orderId,
        rfidCardId: rfidCardId,
        shopName: shopName,
        paymentType: 'rfid'
      }
    };

    const payment = await razorpay.payments.create(paymentOptions);

    // Deduct amount from wallet
    const newBalance = wallet.balance - totalAmount;
    const paymentTransaction = {
      type: 'payment',
      amount: totalAmount,
      description: `RFID Payment for Order #${order.orderId || order._id.slice(-6)}`,
      orderId: order._id,
      paymentId: payment.id,
      timestamp: new Date().toISOString(),
      rfidCardId: rfidCardId,
      deviceId: 'RFID_PAYMENT',
      shopName: shopName
    };

    const updatedTransactions = [...(wallet.transactions || []), paymentTransaction];

    // Update wallet
    await writeClient
      .patch(wallet._id)
      .set({
        balance: newBalance,
        transactions: updatedTransactions,
        lastUpdated: new Date().toISOString()
      })
      .commit();

    // Update order payment status
    await writeClient
      .patch(order._id)
      .set({
        paymentStatus: true,
        paymentMethod: 'rfid',
        paymentId: payment.id,
        paidAt: new Date().toISOString(),
        rfidCardId: rfidCardId,
        deviceId: 'RFID_PAYMENT',
        shopName: shopName
      })
      .commit();

    // Update RFID card last used
    await writeClient
      .patch(rfidCard._id)
      .set({
        lastUsedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString()
      })
      .commit();

    // Update Firebase verification status
    await updateRFIDVerification(shopName, rfidCardId, true);

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      paymentId: payment.id,
      newBalance: newBalance
    });

  } catch (error) {
    console.error('Error processing RFID payment:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to process payment'
    }, { status: 500 });
  }
}
