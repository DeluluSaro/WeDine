import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';

/**
 * GET /api/orders
 * Fetches a user's orders from the correct collections.
 * 
 * Query Params:
 * - userId: The ID of the user whose orders are to be fetched.
 * - type: 'active' | 'history'. Defaults to 'active'.
 *    - 'active': Fetches from 'order' collection (current active orders)
 *    - 'history': Fetches from 'orderHistory' collection (completed/archived orders)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') || 'active'; // 'active' or 'history'

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    let query;
    let orders;

    if (type === 'history') {
      // 'history' shows all orders from the orderHistory collection
      query = `*[_type == "orderHistory" && userId == $userId] | order(createdAt desc)`;
      orders = await client.fetch(`${query}{...}`, { userId });
    } else { // 'active'
      // 'active' shows all non-archived orders from the order collection
      query = `*[_type == "order" && userId == $userId && !isArchived] | order(createdAt desc)`;
      orders = await client.fetch(`${query}{...}`, { userId });
    }
    
    return NextResponse.json({ orders });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Order fetch error:', err);
    return NextResponse.json({ 
      error: 'Failed to fetch orders',
      details: err.message 
    }, { status: 500 });
  }
}

// The POST method is deprecated and removed to keep this API clean and focused on fetching orders.
export async function POST(req: NextRequest) {
  return NextResponse.json({ 
    error: 'This endpoint is deprecated. Please use the new, separate endpoints for order creation.'
  }, { status: 410 });
}