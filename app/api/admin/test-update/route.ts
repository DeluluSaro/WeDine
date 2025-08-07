import { NextRequest, NextResponse } from 'next/server';
import { writeClient, client } from '@/sanity/lib/client';

export async function GET(req: NextRequest) {
  try {
    // Test if we can read from Sanity
    const testOrder = await client.fetch(`
      *[_type == "order" && isArchived != true][0] {
        _id,
        orderId,
        orderIdentifier,
        status,
        updatedAt
      }
    `);

    if (!testOrder) {
      return NextResponse.json({
        success: false,
        message: 'No orders found to test with',
        data: null
      });
    }

    // Test if we can update in Sanity
    const now = new Date();
    const testUpdate = await writeClient.patch(testOrder._id, {
      set: {
        updatedAt: now.toISOString(),
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Sanity client is working properly',
      data: {
        originalOrder: testOrder,
        testUpdate: testUpdate,
        timestamp: now.toISOString()
      }
    });

  } catch (error) {
    console.error('Test update error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to test Sanity client',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 