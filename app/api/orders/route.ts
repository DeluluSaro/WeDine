import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';

/**
 * GET /api/orders
 * Fetches a user's orders from the 'orderHistory' collection.
 * 
 * Query Params:
 * - userId: The ID of the user whose orders are to be fetched.
 * - type: 'active' | 'history'. Defaults to 'active'.
 *    - 'active': Fetches orders with statuses like 'ordered', 'preparing', etc.
 *    - 'history': Fetches completed or cancelled orders.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') || 'active'; // 'active' or 'history'

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Define the statuses that are considered "active"
    const activeStatuses = ['ordered', 'order accepted', 'preparing', 'out for delivery'];

    // All queries now correctly target the 'orderHistory' collection.
    let query;
    const queryParams: { userId: string; activeStatuses?: string[] } = { userId };

    if (type === 'history') {
      // 'history' shows all orders that are NOT in an active state.
      query = `*[_type == "orderHistory" && userId == $userId && !(status in $activeStatuses)] | order(createdAt desc)`
      queryParams.activeStatuses = activeStatuses;
    } else { // 'active'
      // 'active' shows all orders that ARE in an active state.
      query = `*[_type == "orderHistory" && userId == $userId && status in $activeStatuses] | order(createdAt desc)`
      queryParams.activeStatuses = activeStatuses;
    }

    // Fetch all fields to ensure frontend has what it needs
    const orders = await client.fetch(`${query}{...}`, queryParams);
    
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