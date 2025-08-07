import { NextRequest, NextResponse } from 'next/server';
import { writeClient, client } from '@/sanity/lib/client';

export async function PATCH(req: NextRequest) {
  try {
    const { orderId, status } = await req.json();

    console.log('Update request received:', { orderId, status });

    if (!orderId || !status) {
      return NextResponse.json({ 
        error: 'Missing required fields: orderId and status' 
      }, { status: 400 });
    }

    // Validate status
    const validStatuses = [
      'ordered',
      'order accepted', 
      'preparing',
      'out for delivery',
      'delivered',
      'cancelled'
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: 'Invalid status value' 
      }, { status: 400 });
    }

    // First, verify the order exists and get current status
    const existingOrder = await client.fetch(`
      *[_type == "order" && _id == $orderId][0] {
        _id,
        status,
        orderIdentifier,
        orderId
      }
    `, { orderId });

    if (!existingOrder) {
      console.log('Order not found:', orderId);
      return NextResponse.json({ 
        error: 'Order not found' 
      }, { status: 404 });
    }

    console.log('Current order status:', existingOrder.status);
    console.log('Updating to status:', status);

    // Update the order status with commit
    const now = new Date();
    
    // Try the transaction approach first
    try {
      // Create a transaction to ensure the update is committed
      const transaction = writeClient.transaction();
      
      transaction.patch(orderId, {
        set: {
          status: status,
          updatedAt: now.toISOString(),
        }
      });
      
      const updateResult = await transaction.commit();
      console.log('Transaction update result:', updateResult);
    } catch (transactionError) {
      console.log('Transaction failed, trying direct patch:', transactionError);
      
      // Fallback to direct patch
      const updateResult = await writeClient.patch(orderId, {
        set: {
          status: status,
          updatedAt: now.toISOString(),
        }
      });
      
      console.log('Direct patch update result:', updateResult);
    }

    // Wait a moment for the update to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify the update was successful by fetching the updated order
    const updatedOrder = await client.fetch(`
      *[_type == "order" && _id == $orderId][0] {
        _id,
        status,
        updatedAt
      }
    `, { orderId });

    console.log('Updated order verification:', updatedOrder);

    if (!updatedOrder || updatedOrder.status !== status) {
      console.error('Update verification failed:', { expected: status, actual: updatedOrder?.status });
      
      // Try one more time with a longer delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const finalCheck = await client.fetch(`
        *[_type == "order" && _id == $orderId][0] {
          _id,
          status,
          updatedAt
        }
      `, { orderId });
      
      console.log('Final verification check:', finalCheck);
      
      if (!finalCheck || finalCheck.status !== status) {
        return NextResponse.json({ 
          error: 'Update verification failed - status was not updated correctly',
          details: {
            expected: status,
            actual: finalCheck?.status,
            updateResult,
            finalCheck
          }
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Order status updated successfully',
      orderId,
      oldStatus: existingOrder.status,
      newStatus: status,
      updatedAt: now.toISOString(),
      verification: updatedOrder
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ 
      error: 'Failed to update order status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 