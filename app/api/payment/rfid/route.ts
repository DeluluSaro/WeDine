import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/sanity/lib/client';
import crypto from 'crypto';

// Security: Store RFID card mappings securely
const RFID_CARD_MAPPINGS: Record<string, string> = {
  // This should be populated with actual RFID card IDs mapped to user emails
  // In production, this should be stored in a secure database
  'A1B2C3D4': 'student1@vitstudent.ac.in',
  'E5F6G7H8': 'student2@vitstudent.ac.in',
  // Add more mappings as needed
};

export async function POST(request: NextRequest) {
  try {
    const { rfidCardId, orderId, shopId, totalAmount, timestamp, signature } = await request.json();

    // Validate required fields
    if (!rfidCardId || !orderId || !shopId || !totalAmount || !timestamp || !signature) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required payment data' 
      }, { status: 400 });
    }

    // Verify timestamp (prevent replay attacks)
    const currentTime = Date.now();
    const requestTime = new Date(timestamp).getTime();
    const timeDiff = Math.abs(currentTime - requestTime);
    
    if (timeDiff > 300000) { // 5 minutes tolerance
      return NextResponse.json({ 
        success: false, 
        message: 'Request timestamp is too old' 
      }, { status: 400 });
    }

    // Verify signature (basic security)
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RFID_SECRET_KEY || 'default_secret')
      .update(`${rfidCardId}${orderId}${totalAmount}${timestamp}`)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid request signature' 
      }, { status: 400 });
    }

    // Get user email from RFID card ID
    const userEmail = RFID_CARD_MAPPINGS[rfidCardId];
    if (!userEmail) {
      return NextResponse.json({ 
        success: false, 
        message: 'RFID card not registered' 
      }, { status: 404 });
    }

    // Get wallet
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

    // Check if wallet has sufficient balance
    if (wallet.balance < totalAmount) {
      return NextResponse.json({ 
        success: false, 
        message: 'Insufficient wallet balance',
        currentBalance: wallet.balance,
        requiredAmount: totalAmount
      }, { status: 400 });
    }

    // Get order details
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

    // Check if order is already paid
    if (order.paymentStatus) {
      return NextResponse.json({ 
        success: false, 
        message: 'Order already paid' 
      }, { status: 400 });
    }

    // Deduct amount from wallet
    const newBalance = wallet.balance - totalAmount;
    const paymentTransaction = {
      type: 'payment',
      amount: totalAmount,
      description: `Payment for Order #${order.orderId || order._id.slice(-6)}`,
      orderId: order._id,
      paymentId: `rfid_${Date.now()}`,
      timestamp: new Date().toISOString()
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
        paymentMethod: 'RFID',
        paymentId: paymentTransaction.paymentId,
        paidAt: new Date().toISOString()
      })
      .commit();

    // Get shop details for vendor payment
    const shop = await writeClient.fetch(
      `*[_type == "shop" && _id == $shopId][0]`,
      { shopId }
    );

    return NextResponse.json({ 
      success: true, 
      message: 'RFID payment successful',
      paymentDetails: {
        paymentId: paymentTransaction.paymentId,
        amount: totalAmount,
        newBalance: newBalance,
        orderId: order._id,
        shopName: shop?.shopName || 'Unknown Shop',
        timestamp: paymentTransaction.timestamp
      }
    });

  } catch (error) {
    console.error('Error processing RFID payment:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to process RFID payment' 
    }, { status: 500 });
  }
}

// API to register RFID cards (for admin use)
export async function PUT(request: NextRequest) {
  try {
    const { rfidCardId, userEmail, adminKey } = await request.json();

    // Verify admin key
    if (adminKey !== process.env.ADMIN_RFID_KEY) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    if (!rfidCardId || !userEmail) {
      return NextResponse.json({ 
        success: false, 
        message: 'RFID card ID and user email are required' 
      }, { status: 400 });
    }

    // In production, store this in a secure database
    RFID_CARD_MAPPINGS[rfidCardId] = userEmail;

    return NextResponse.json({ 
      success: true, 
      message: 'RFID card registered successfully' 
    });

  } catch (error) {
    console.error('Error registering RFID card:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to register RFID card' 
    }, { status: 500 });
  }
}
