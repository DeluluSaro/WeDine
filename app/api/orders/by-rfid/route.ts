import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';

/**
 * GET /api/orders/by-rfid
 * Fetches all orders associated with a specific RFID card
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rfidCardId = searchParams.get('rfidCardId');

    if (!rfidCardId) {
      return NextResponse.json({ 
        error: 'RFID Card ID is required' 
      }, { status: 400 });
    }

    // Find orders directly by RFID card ID
    const ordersQuery = `*[_type == "order" && rfidCardId == $rfidCardId && !isArchived] | order(createdAt desc) {
      _id,
      orderIdentifier,
      shortOrderId,
      userId,
      userEmail,
      rfidCardId,
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

    const orders = await client.fetch(ordersQuery, { rfidCardId });

    // Get RFID card info for display (optional)
    let rfidCardInfo = null;
    try {
      const rfidQuery = `*[_type == "rfidCard" && cardId == $cardId && isActive == true][0] {
        _id,
        cardId,
        userEmail,
        studentName,
        isActive,
        isBlocked
      }`;
      rfidCardInfo = await client.fetch(rfidQuery, { cardId: rfidCardId });
    } catch (error) {
      console.log('Could not fetch RFID card info:', error);
    }

    return NextResponse.json({ 
      success: true,
      rfidCard: rfidCardInfo ? {
        cardId: rfidCardInfo.cardId,
        studentName: rfidCardInfo.studentName,
        userEmail: rfidCardInfo.userEmail,
        isActive: rfidCardInfo.isActive,
        isBlocked: rfidCardInfo.isBlocked
      } : {
        cardId: rfidCardId,
        studentName: null,
        userEmail: null,
        isActive: true,
        isBlocked: false
      },
      orders: orders,
      totalOrders: orders.length
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('RFID orders fetch error:', err);
    return NextResponse.json({ 
      error: 'Failed to fetch orders for RFID card',
      details: err.message 
    }, { status: 500 });
  }
}

