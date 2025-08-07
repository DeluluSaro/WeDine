import { NextRequest, NextResponse } from 'next/server';
import { writeClient, client } from '@/sanity/lib/client';

export async function POST(req: NextRequest) {
  try {
    const { orderId, newStatus } = await req.json();

    console.log('Debug update request:', { orderId, newStatus });

    // Step 1: Check environment variables
    const envCheck = {
      hasToken: !!process.env.SANITY_API_TOKEN,
      tokenLength: process.env.SANITY_API_TOKEN?.length,
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
      apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION
    };

    console.log('Environment check:', envCheck);

    if (!process.env.SANITY_API_TOKEN) {
      return NextResponse.json({
        success: false,
        step: 'environment',
        error: 'SANITY_API_TOKEN is missing',
        envCheck
      });
    }

    // Step 2: Find the order
    const order = await client.fetch(`
      *[_type == "order" && _id == $orderId][0] {
        _id,
        orderId,
        orderIdentifier,
        status,
        updatedAt
      }
    `, { orderId });

    console.log('Found order:', order);

    if (!order) {
      return NextResponse.json({
        success: false,
        step: 'find_order',
        error: 'Order not found',
        orderId,
        envCheck
      });
    }

    // Step 3: Attempt update
    const now = new Date();
    console.log('Attempting update with:', {
      orderId,
      currentStatus: order.status,
      newStatus,
      timestamp: now.toISOString()
    });

    try {
      const updateResult = await writeClient.patch(orderId, {
        set: {
          status: newStatus,
          updatedAt: now.toISOString(),
        }
      });

      console.log('Update result:', updateResult);

      // Wait a moment for the update to propagate
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 4: Verify update
      const updatedOrder = await client.fetch(`
        *[_type == "order" && _id == $orderId][0] {
          _id,
          status,
          updatedAt
        }
      `, { orderId });

      console.log('Verification result:', updatedOrder);

      const updateSuccessful = updatedOrder && updatedOrder.status === newStatus;

      return NextResponse.json({
        success: updateSuccessful,
        step: 'verification',
        orderId,
        oldStatus: order.status,
        newStatus,
        updateSuccessful,
        updateResult,
        verification: updatedOrder,
        envCheck
      });

    } catch (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({
        success: false,
        step: 'update',
        error: 'Update failed',
        updateError: updateError instanceof Error ? updateError.message : 'Unknown error',
        orderId,
        oldStatus: order.status,
        newStatus,
        envCheck
      });
    }

  } catch (error) {
    console.error('Debug update error:', error);
    return NextResponse.json({ 
      success: false,
      step: 'general',
      error: 'General error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 