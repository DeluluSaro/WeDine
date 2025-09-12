import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';

/**
 * PUT /api/orders/bulk-update
 * Updates multiple orders at once
 */
export async function PUT(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const body = await req.json();
    const { updates } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ 
        error: 'Missing or invalid updates array' 
      }, { status: 400 });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { orderId, status, paymentStatus, paymentDetails } = update;

        if (!orderId || !status) {
          errors.push({ orderId, error: 'Missing orderId or status' });
          continue;
        }

        // Check if order exists
        const existingOrder = await client.fetch(
          `*[_type == "order" && _id == $orderId][0]`,
          { orderId }
        );

        if (!existingOrder) {
          errors.push({ orderId, error: 'Order not found' });
          continue;
        }

        // Prepare update data
        const updateData: any = {
          status,
          updatedAt: new Date().toISOString()
        };

        if (paymentStatus !== undefined) {
          updateData.paymentStatus = Boolean(paymentStatus);
          updateData.orderStatus = Boolean(paymentStatus);
        }

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

        results.push({ orderId, success: true, order: updatedOrder });

        // Create history entry for completed orders
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
              lifecycleNotes: `Bulk update: Order ${status} on ${new Date().toISOString()}`,
              paymentDetails: updateData.paymentDetails || existingOrder.paymentDetails
            });
          } catch (historyError) {
            console.error(`Failed to create order history for ${orderId}:`, historyError);
          }
        }

      } catch (error) {
        const err = error as Error;
        errors.push({ orderId: update.orderId, error: err.message });
      }
    }

    return NextResponse.json({ 
      success: true, 
      results,
      errors,
      summary: {
        total: updates.length,
        successful: results.length,
        failed: errors.length
      }
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Bulk order update error:', err);
    return NextResponse.json({ 
      error: 'Failed to update orders',
      details: err.message 
    }, { status: 500 });
  }
}
