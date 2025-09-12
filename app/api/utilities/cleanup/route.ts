import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';

/**
 * POST /api/utilities/cleanup
 * Performs various cleanup operations on the database
 */
export async function POST(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const body = await req.json();
    const { operations } = body;

    if (!Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json({ 
        error: 'Missing or invalid operations array' 
      }, { status: 400 });
    }

    const results = [];
    const errors = [];

    for (const operation of operations) {
      try {
        let result;

        switch (operation.type) {
          case 'cleanup-expired-orders':
            result = await cleanupExpiredOrders();
            break;

          case 'cleanup-empty-carts':
            result = await cleanupEmptyCarts();
            break;

          case 'archive-completed-orders':
            result = await archiveCompletedOrders();
            break;

          case 'cleanup-orphaned-cart-items':
            result = await cleanupOrphanedCartItems();
            break;

          case 'update-food-ratings':
            result = await updateFoodRatings();
            break;

          case 'cleanup-old-reviews':
            result = await cleanupOldReviews(operation.daysOld || 365);
            break;

          default:
            errors.push({ operation: operation.type, error: 'Unknown operation type' });
            continue;
        }

        results.push({ operation: operation.type, success: true, result });

      } catch (error) {
        const err = error as Error;
        errors.push({ operation: operation.type, error: err.message });
      }
    }

    return NextResponse.json({ 
      success: true, 
      results,
      errors,
      summary: {
        total: operations.length,
        successful: results.length,
        failed: errors.length
      }
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Cleanup operations error:', err);
    return NextResponse.json({ 
      error: 'Failed to perform cleanup operations',
      details: err.message 
    }, { status: 500 });
  }
}

// Helper functions for cleanup operations

async function cleanupExpiredOrders() {
  const now = new Date().toISOString();
  
  // Find expired orders
  const expiredOrders = await client.fetch(
    `*[_type == "order" && expiresAt < $now && !isArchived]`,
    { now }
  );

  let archivedCount = 0;

  for (const order of expiredOrders) {
    try {
      // Create history entry
      await writeClient.create({
        _type: 'orderHistory',
        userId: order.userId,
        userEmail: order.userEmail,
        orderIdentifier: order.orderIdentifier,
        items: order.items,
        total: order.total,
        paymentMethod: order.paymentMethod,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        archivedAt: now,
        paymentStatus: order.paymentStatus,
        originalOrderId: order._id,
        lifecycleNotes: `Auto-archived due to expiration on ${now}`,
        paymentDetails: order.paymentDetails
      });

      // Mark as archived
      await writeClient
        .patch(order._id)
        .set({ isArchived: true, archivedAt: now })
        .commit();

      archivedCount++;
    } catch (error) {
      console.error(`Failed to archive expired order ${order._id}:`, error);
    }
  }

  return { archivedCount, totalExpired: expiredOrders.length };
}

async function cleanupEmptyCarts() {
  // Find cart items with quantity 0 or negative
  const emptyCartItems = await client.fetch(
    `*[_type == "cartItem" && quantity <= 0]`
  );

  let deletedCount = 0;

  for (const item of emptyCartItems) {
    try {
      await writeClient.delete(item._id);
      deletedCount++;
    } catch (error) {
      console.error(`Failed to delete empty cart item ${item._id}:`, error);
    }
  }

  return { deletedCount, totalEmpty: emptyCartItems.length };
}

async function archiveCompletedOrders() {
  const completedStatuses = ['delivered', 'cancelled'];
  
  // Find completed orders that aren't archived
  const completedOrders = await client.fetch(
    `*[_type == "order" && status in $statuses && !isArchived]`,
    { statuses: completedStatuses }
  );

  let archivedCount = 0;

  for (const order of completedOrders) {
    try {
      // Create history entry
      await writeClient.create({
        _type: 'orderHistory',
        userId: order.userId,
        userEmail: order.userEmail,
        orderIdentifier: order.orderIdentifier,
        items: order.items,
        total: order.total,
        paymentMethod: order.paymentMethod,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        archivedAt: new Date().toISOString(),
        paymentStatus: order.paymentStatus,
        originalOrderId: order._id,
        lifecycleNotes: `Auto-archived completed order`,
        paymentDetails: order.paymentDetails
      });

      // Mark as archived
      await writeClient
        .patch(order._id)
        .set({ isArchived: true, archivedAt: new Date().toISOString() })
        .commit();

      archivedCount++;
    } catch (error) {
      console.error(`Failed to archive completed order ${order._id}:`, error);
    }
  }

  return { archivedCount, totalCompleted: completedOrders.length };
}

async function cleanupOrphanedCartItems() {
  // Find cart items where the food item no longer exists
  const cartItems = await client.fetch(
    `*[_type == "cartItem"]`
  );

  let deletedCount = 0;

  for (const item of cartItems) {
    try {
      const foodItem = await client.fetch(
        `*[_type == "foodItem" && _id == $foodId][0]`,
        { foodId: item.foodId._ref }
      );

      if (!foodItem) {
        await writeClient.delete(item._id);
        deletedCount++;
      }
    } catch (error) {
      console.error(`Failed to check cart item ${item._id}:`, error);
    }
  }

  return { deletedCount, totalChecked: cartItems.length };
}

async function updateFoodRatings() {
  const foodItems = await client.fetch(
    `*[_type == "foodItem"]`
  );

  let updatedCount = 0;

  for (const foodItem of foodItems) {
    try {
      const reviews = await client.fetch(
        `*[_type == "review" && foodItem._ref == $foodId]`,
        { foodId: foodItem._id }
      );

      if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / reviews.length;

        await writeClient
          .patch(foodItem._id)
          .set({
            rating: Math.round(averageRating * 10) / 10,
            reviews: reviews.length
          })
          .commit();

        updatedCount++;
      }
    } catch (error) {
      console.error(`Failed to update ratings for food item ${foodItem._id}:`, error);
    }
  }

  return { updatedCount, totalFoodItems: foodItems.length };
}

async function cleanupOldReviews(daysOld: number) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const oldReviews = await client.fetch(
    `*[_type == "review" && _createdAt < $cutoffDate]`,
    { cutoffDate: cutoffDate.toISOString() }
  );

  let deletedCount = 0;

  for (const review of oldReviews) {
    try {
      await writeClient.delete(review._id);
      deletedCount++;
    } catch (error) {
      console.error(`Failed to delete old review ${review._id}:`, error);
    }
  }

  return { deletedCount, totalOld: oldReviews.length };
}

