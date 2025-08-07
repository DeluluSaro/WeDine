import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';

export async function GET(req: NextRequest) {
  try {
    // Get all orders
    const allOrders = await client.fetch(`
      *[_type == "order"] {
        _id,
        orderId,
        orderIdentifier,
        userId,
        userEmail,
        status,
        isArchived,
        createdAt
      }
    `);

    // Get all order history
    const allOrderHistory = await client.fetch(`
      *[_type == "orderHistory"] {
        _id,
        orderId,
        orderIdentifier,
        userId,
        userEmail,
        status,
        createdAt
      }
    `);

    // Get all shops
    const allShops = await client.fetch(`
      *[_type == "shop"] {
        _id,
        shopName
      }
    `);

    return NextResponse.json({
      success: true,
      data: {
        orders: allOrders,
        orderHistory: allOrderHistory,
        shops: allShops,
        counts: {
          orders: allOrders.length,
          orderHistory: allOrderHistory.length,
          shops: allShops.length
        }
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch debug data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 