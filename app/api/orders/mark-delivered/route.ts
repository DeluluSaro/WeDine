import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/sanity/lib/client';

/**
 * POST /api/orders/mark-delivered
 * Marks one or more orders as delivered
 */
export async function POST(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const body = await req.json();
    const { orderIds, adminNotes } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ 
        error: 'Order IDs array is required' 
      }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updatedOrders = [];

    // Update each order to delivered status
    for (const orderId of orderIds) {
      try {
        const updatedOrder = await writeClient
          .patch(orderId)
          .set({
            status: 'delivered',
            updatedAt: now,
            deliveredAt: now,
            ...(adminNotes && { adminNotes })
          })
          .commit();

        updatedOrders.push({
          orderId: orderId,
          shortOrderId: updatedOrder.shortOrderId,
          status: 'delivered',
          deliveredAt: now
        });
      } catch (error) {
        console.error(`Failed to update order ${orderId}:`, error);
        // Continue with other orders even if one fails
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully marked ${updatedOrders.length} order(s) as delivered`,
      updatedOrders,
      totalUpdated: updatedOrders.length
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Mark delivered error:', err);
    return NextResponse.json({ 
      error: 'Failed to mark orders as delivered',
      details: err.message 
    }, { status: 500 });
  }
}


