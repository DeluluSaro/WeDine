import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/sanity/lib/client';
import crypto from 'crypto';

export async function PUT(request: NextRequest) {
  try {
    const { rfidCardId, userEmail, studentName, studentId, collegeName, cardType, adminKey } = await request.json();

    // Validate required fields
    if (!rfidCardId || !userEmail || !studentName || !adminKey) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required registration data' 
      }, { status: 400 });
    }

    // Verify admin key (check both possible env variables)
    const validAdminKey = process.env.NEXT_PUBLIC_ADMIN_RFID_KEY || process.env.ADMIN_RFID_KEY;
    if (adminKey !== validAdminKey) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid admin key' 
      }, { status: 401 });
    }

    // Check if RFID card already exists
    const existingCard = await writeClient.fetch(
      `*[_type == "rfidCard" && cardId == $cardId][0]`,
      { cardId: rfidCardId }
    );

    if (existingCard) {
      return NextResponse.json({ 
        success: false, 
        message: 'RFID card already registered' 
      }, { status: 409 });
    }

    // Check if user already has a card
    const existingUserCard = await writeClient.fetch(
      `*[_type == "rfidCard" && userEmail == $userEmail && isActive == true][0]`,
      { userEmail }
    );

    if (existingUserCard) {
      return NextResponse.json({ 
        success: false, 
        message: 'User already has an active RFID card' 
      }, { status: 409 });
    }

    // Create new RFID card registration
    const rfidCard = {
      _type: 'rfidCard',
      cardId: rfidCardId,
      userEmail: userEmail,
      studentName: studentName,
      studentId: studentId || '',
      collegeName: collegeName || '',
      cardType: cardType || 'student',
      isActive: true,
      isBlocked: false,
      registeredAt: new Date().toISOString(),
      registeredBy: 'admin',
      lastUsedAt: null,
      notes: `Registered via API on ${new Date().toLocaleString()}`
    };

    const result = await writeClient.create(rfidCard);

    return NextResponse.json({ 
      success: true,
      message: 'RFID card registered successfully',
      card: result
    });

  } catch (error) {
    console.error('Error registering RFID card:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to register RFID card' 
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { rfidCardId, userEmail, studentName, adminKey } = await request.json();

    // Validate required fields
    if (!rfidCardId || !userEmail || !studentName || !adminKey) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required update data' 
      }, { status: 400 });
    }

    // Verify admin key
    if (adminKey !== process.env.NEXT_PUBLIC_ADMIN_RFID_KEY) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid admin key' 
      }, { status: 401 });
    }

    // Find existing RFID card for this user
    const existingCard = await writeClient.fetch(
      `*[_type == "rfidCard" && userEmail == $userEmail && isActive == true][0]`,
      { userEmail: userEmail }
    );

    if (!existingCard) {
      return NextResponse.json({ 
        success: false, 
        message: 'No RFID card found for this user' 
      }, { status: 404 });
    }

    // Check if new card ID is already in use by another user
    const cardInUse = await writeClient.fetch(
      `*[_type == "rfidCard" && cardId == $cardId && userEmail != $userEmail][0]`,
      { cardId: rfidCardId, userEmail: userEmail }
    );

    if (cardInUse) {
      return NextResponse.json({ 
        success: false, 
        message: 'RFID card already registered to another user' 
      }, { status: 409 });
    }

    // Update RFID card
    const updatedCard = await writeClient
      .patch(existingCard._id)
      .set({
        cardId: rfidCardId,
        studentName: studentName,
        lastUpdatedAt: new Date().toISOString()
      })
      .commit();

    return NextResponse.json({ 
      success: true,
      message: 'RFID card updated successfully',
      rfidCard: updatedCard
    });

  } catch (error) {
    console.error('Error updating RFID card:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to update RFID card' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { rfidCardId, orderId, shopId, totalAmount, timestamp, signature, deviceId } = await request.json();

    // Validate required fields
    if (!rfidCardId || !orderId || !shopId || !totalAmount || !timestamp || !signature || !deviceId) {
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
      .update(`${rfidCardId}${orderId}${totalAmount}${timestamp}${deviceId}`)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid request signature' 
      }, { status: 400 });
    }

    // Get RFID card details from database
    const rfidCard = await writeClient.fetch(
      `*[_type == "rfidCard" && cardId == $cardId && isActive == true && isBlocked != true][0]`,
      { cardId: rfidCardId }
    );

    if (!rfidCard) {
      return NextResponse.json({ 
        success: false, 
        message: 'RFID card not found or inactive' 
      }, { status: 404 });
    }

    // Get user email from RFID card
    const userEmail = rfidCard.userEmail;

    // Get wallet
    const wallet = await writeClient.fetch(
      `*[_type == "wallet" && userEmail == $userEmail][0]`,
      { userEmail }
    );

    if (!wallet) {
      return NextResponse.json({ 
        success: false, 
        message: 'Wallet not found for this card' 
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
      description: `RFID Payment for Order #${order.orderId || order._id.slice(-6)}`,
      orderId: order._id,
      paymentId: `rfid_${Date.now()}_${rfidCardId.slice(-4)}`,
      timestamp: new Date().toISOString(),
      rfidCardId: rfidCardId,
      deviceId: deviceId
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
        paymentId: paymentTransaction.paymentId,
        paidAt: new Date().toISOString(),
        rfidCardId: rfidCardId,
        deviceId: deviceId
      })
      .commit();

    // Update RFID card last used timestamp
    await writeClient
      .patch(rfidCard._id)
      .set({
        lastUsedAt: new Date().toISOString()
      })
      .commit();

    // Get shop details
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
        studentName: rfidCard.studentName,
        cardId: rfidCardId,
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


// API to get RFID card details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('cardId');
    const userEmail = searchParams.get('userEmail');

    if (!cardId && !userEmail) {
      return NextResponse.json({ 
        success: false, 
        message: 'Card ID or user email is required' 
      }, { status: 400 });
    }

    let query;
    let params;

    if (cardId) {
      query = `*[_type == "rfidCard" && cardId == $cardId][0]`;
      params = { cardId };
    } else {
      query = `*[_type == "rfidCard" && userEmail == $userEmail && isActive == true][0]`;
      params = { userEmail };
    }

    const rfidCard = await writeClient.fetch(query, params);

    if (!rfidCard) {
      return NextResponse.json({ 
        success: false, 
        message: 'RFID card not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      card: rfidCard
    });

  } catch (error) {
    console.error('Error fetching RFID card:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to fetch RFID card' 
    }, { status: 500 });
  }
}
