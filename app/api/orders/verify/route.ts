import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';
import { isValidOrderId } from '@/lib/orderIdGenerator';

/**
 * POST /api/orders/verify
 * Verifies an order by its 5-character order ID
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, rfidCardId } = body;

    if (!orderId) {
      return NextResponse.json({ 
        error: 'Order ID is required' 
      }, { status: 400 });
    }

    // Validate order ID format
    if (!isValidOrderId(orderId)) {
      return NextResponse.json({ 
        error: 'Invalid order ID format. Must be 5 characters.' 
      }, { status: 400 });
    }

    // Search for order by shortOrderId
    const query = `*[_type == "order" && shortOrderId == $orderId && !isArchived] {
      _id,
      orderIdentifier,
      shortOrderId,
      userId,
      userEmail,
      items,
      total,
      paymentMethod,
      status,
      orderStatus,
      paymentStatus,
      createdAt,
      updatedAt,
      userDetails,
      paymentDetails
    }`;

    const orders = await client.fetch(query, { orderId: orderId.toUpperCase() });

    if (orders.length === 0) {
      return NextResponse.json({ 
        error: 'Order not found',
        orderId: orderId.toUpperCase()
      }, { status: 404 });
    }

    const order = orders[0];

    // If RFID card ID is provided, we can add additional verification logic here
    // For example, checking if the RFID card matches the user's registered card
    let rfidVerification = null;
    if (rfidCardId) {
      // Check if the RFID card is registered and matches the user
      const rfidQuery = `*[_type == "rfidCard" && cardId == $cardId && userEmail == $userEmail && isActive == true] {
        _id,
        cardId,
        userEmail,
        studentName,
        isActive,
        isBlocked
      }`;
      
      const rfidCards = await client.fetch(rfidQuery, { 
        cardId: rfidCardId, 
        userEmail: order.userEmail 
      });

      rfidVerification = {
        cardFound: rfidCards.length > 0,
        cardActive: rfidCards.length > 0 && !rfidCards[0].isBlocked,
        studentName: rfidCards.length > 0 ? rfidCards[0].studentName : null
      };
    }

    return NextResponse.json({ 
      success: true,
      order: {
        _id: order._id,
        orderIdentifier: order.orderIdentifier,
        shortOrderId: order.shortOrderId,
        userId: order.userId,
        userEmail: order.userEmail,
        items: order.items,
        total: order.total,
        paymentMethod: order.paymentMethod,
        status: order.status,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        userDetails: order.userDetails,
        paymentDetails: order.paymentDetails
      },
      rfidVerification,
      verifiedAt: new Date().toISOString()
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Order verification error:', err);
    return NextResponse.json({ 
      error: 'Failed to verify order',
      details: err.message 
    }, { status: 500 });
  }
}

/**
 * GET /api/orders/verify
 * Get order verification status (for testing)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ 
        error: 'Order ID is required' 
      }, { status: 400 });
    }

    // Validate order ID format
    if (!isValidOrderId(orderId)) {
      return NextResponse.json({ 
        error: 'Invalid order ID format. Must be 5 characters.' 
      }, { status: 400 });
    }

    // Search for order by shortOrderId
    const query = `*[_type == "order" && shortOrderId == $orderId && !isArchived] {
      _id,
      orderIdentifier,
      shortOrderId,
      status,
      paymentStatus,
      userDetails
    }`;

    const orders = await client.fetch(query, { orderId: orderId.toUpperCase() });

    if (orders.length === 0) {
      return NextResponse.json({ 
        error: 'Order not found',
        orderId: orderId.toUpperCase()
      }, { status: 404 });
    }

    const order = orders[0];

    return NextResponse.json({ 
      success: true,
      order: {
        _id: order._id,
        orderIdentifier: order.orderIdentifier,
        shortOrderId: order.shortOrderId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        customerName: order.userDetails?.name || 'Unknown'
      }
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Order verification error:', err);
    return NextResponse.json({ 
      error: 'Failed to verify order',
      details: err.message 
    }, { status: 500 });
  }
}



