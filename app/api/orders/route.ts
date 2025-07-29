/**
 * DEPRECATED: Order API Routes
 * 
 * POST /api/orders - DISABLED (use /api/orders/create-order instead)
 * GET /api/orders - ACTIVE (for fetching orders)
 * 
 * The POST method has been disabled to prevent duplicate orders.
 * All order creation should use /api/orders/create-order which includes
 * proper duplicate prevention and enhanced features.
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeClient, client } from '@/sanity/lib/client';
import { calculateTotalAmount } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  // DISABLED: This endpoint is deprecated. Use /api/orders/create-order instead.
  // This prevents duplicate orders and ensures proper duplicate prevention.
  return NextResponse.json({ 
    error: 'This endpoint is deprecated. Please use /api/orders/create-order for creating orders.',
    message: 'The old /api/orders endpoint has been disabled to prevent duplicate orders. All order creation should go through /api/orders/create-order which includes proper duplicate prevention.'
  }, { status: 410 }); // 410 Gone - indicates the resource is permanently unavailable
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') || 'active'; // 'active' or 'history'

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (type === 'history') {
      const orders = await client.fetch(`
        *[_type == "orderHistory" && userId == $userId] | order(createdAt desc) {
          _id,
          userId,
          orderId,
          userEmail,
          items,
          total,
          paymentMethod,
          orderStatus,
          status,
          createdAt,
          updatedAt,
          paymentStatus,
          archivedAt,
          originalOrderId,
          lifecycleNotes,
          paymentDetails
        }
      `, { userId });
      return NextResponse.json({ orders });
    } else {
      const orders = await client.fetch(`
        *[_type == "order" && userId == $userId && isArchived != true] | order(createdAt desc) {
          _id,
          userId,
          orderId,
          userEmail,
          items,
          total,
          paymentMethod,
          orderStatus,
          status,
          createdAt,
          updatedAt,
          paymentStatus,
          expiresAt,
          isArchived,
          archivedAt,
          paymentDetails
        }
      `, { userId });
      return NextResponse.json({ orders });
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Order fetch error:', err);
    return NextResponse.json({ 
      error: err.message 
    }, { status: 500 });
  }
} 