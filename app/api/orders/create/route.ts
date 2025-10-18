import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/sanity/lib/client';
import { generateOrderId } from '@/lib/orderIdGenerator';

/**
 * POST /api/orders/create
 * Creates a new order in the active orders collection
 */
export async function POST(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const body = await req.json();
    const {
      userId,
      userEmail,
      items,
      total,
      paymentMethod = 'cod',
      userDetails
    } = body;

    // Get user's RFID card ID from their wallet or RFID card record
    let rfidCardId = null;
    try {
      // First try to get from wallet
      const wallet = await writeClient.fetch(
        `*[_type == "wallet" && userEmail == $userEmail][0] { rfidCardId }`,
        { userEmail }
      );
      
      if (wallet?.rfidCardId) {
        rfidCardId = wallet.rfidCardId;
      } else {
        // Try to get from RFID card collection
        const rfidCard = await writeClient.fetch(
          `*[_type == "rfidCard" && userEmail == $userEmail && isActive == true][0] { cardId }`,
          { userEmail }
        );
        
        if (rfidCard?.cardId) {
          rfidCardId = rfidCard.cardId;
        }
      }
    } catch (error) {
      console.log('Could not fetch RFID card ID for user:', userEmail);
    }

    // Validate required fields
    if (!userId || !userEmail || !items || !Array.isArray(items) || items.length === 0 || !total) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, userEmail, items (array), and total are required' 
      }, { status: 400 });
    }

    // Validate items structure
    for (const item of items) {
      if (!item.foodName || !item.quantity || !item.price || !item.shopName) {
        return NextResponse.json({ 
          error: 'Invalid item structure: each item must have foodName, quantity, price, and shopName' 
        }, { status: 400 });
      }
    }

    // Generate unique 5-character order ID for easy memorization
    const orderId = generateOrderId();
    const timestamp = Date.now();
    const orderIdentifier = `${orderId}-${timestamp}`;

    // Calculate expiration time (24 hours from now)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const order = await writeClient.create({
      _type: 'order',
      userId,
      userEmail,
      rfidCardId, // Include RFID card ID if available
      orderIdentifier,
      shortOrderId: orderId,
      items: items.map(item => ({
        foodName: item.foodName,
        quantity: Number(item.quantity),
        price: Number(item.price),
        shopName: item.shopName
      })),
      total: Number(total),
      paymentMethod,
      orderStatus: false, // Initially unpaid
      status: 'ordered',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      paymentStatus: false,
      expiresAt: expiresAt.toISOString(),
      isArchived: false,
      // Include user details if provided
      ...(userDetails && {
        userDetails: {
          name: userDetails.name,
          phone: userDetails.phone,
          address: userDetails.address
        }
      })
    });

    return NextResponse.json({ 
      success: true, 
      order,
      orderId: order._id,
      orderIdentifier,
      shortOrderId: orderId // Return the 5-character ID for easy display
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Order creation error:', err);
    return NextResponse.json({ 
      error: 'Failed to create order',
      details: err.message 
    }, { status: 500 });
  }
}
