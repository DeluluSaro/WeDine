import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';

/**
 * PUT /api/orders/update-status
 * Updates the status of an order
 */
export async function PUT(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const body = await req.json();
    const { orderId, status, paymentStatus, paymentDetails } = body;

    if (!orderId || !status) {
      return NextResponse.json({ 
        error: 'Missing required fields: orderId and status are required' 
      }, { status: 400 });
    }

    // Valid status values
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
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      }, { status: 400 });
    }

    // Check if order exists
    const existingOrder = await client.fetch(
      `*[_type == "order" && _id == $orderId][0]`,
      { orderId }
    );

    if (!existingOrder) {
      return NextResponse.json({ 
        error: 'Order not found' 
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      status,
      updatedAt: new Date().toISOString()
    };

    // Update payment status if provided
    if (paymentStatus !== undefined) {
      updateData.paymentStatus = Boolean(paymentStatus);
      updateData.orderStatus = Boolean(paymentStatus);
    }

    // Update payment details if provided
    if (paymentDetails) {
      updateData.paymentDetails = {
        ...paymentDetails,
        paidAt: paymentDetails.paidAt || new Date().toISOString()
      };
    }

    // If order is delivered or cancelled, mark it for archiving
    if (status === 'delivered' || status === 'cancelled') {
      updateData.isArchived = true;
      updateData.archivedAt = new Date().toISOString();
    }

    const updatedOrder = await writeClient
      .patch(orderId)
      .set(updateData)
      .commit();

    // If order is delivered or cancelled, also create a history entry
    if (status === 'delivered' || status === 'cancelled') {
      try {
        await writeClient.create({
          _type: 'orderHistory',
          userId: existingOrder.userId,
          userEmail: existingOrder.userEmail,
          orderIdentifier: existingOrder.orderIdentifier,
          items: existingOrder.items,
          total: existingOrder.total,
          paymentMethod: existingOrder.paymentMethod,
          status: existingOrder.status,
          createdAt: existingOrder.createdAt,
          updatedAt: updateData.updatedAt,
          archivedAt: updateData.archivedAt,
          paymentStatus: updateData.paymentStatus || existingOrder.paymentStatus,
          originalOrderId: orderId,
          lifecycleNotes: `Order ${status} on ${new Date().toISOString()}`,
          paymentDetails: updateData.paymentDetails || existingOrder.paymentDetails
        });
      } catch (historyError) {
        console.error('Failed to create order history:', historyError);
        // Don't fail the main operation if history creation fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      order: updatedOrder 
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Order status update error:', err);
    return NextResponse.json({ 
      error: 'Failed to update order status',
      details: err.message 
    }, { status: 500 });
  }
}
