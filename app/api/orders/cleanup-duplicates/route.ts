import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Debug: Starting enhanced duplicate order cleanup...');

    // Find all orders with orderIdentifier
    const allOrders = await client.fetch(`
      *[_type == "order"] {
        _id,
        userId,
        orderIdentifier,
        createdAt,
        paymentStatus,
        isArchived,
        paymentMethod
      }
    `);

    // Find all order history records with orderIdentifier
    const allHistoryOrders = await client.fetch(`
      *[_type == "orderHistory"] {
        _id,
        userId,
        orderIdentifier,
        createdAt,
        originalOrderId
      }
    `);

    console.log('🔍 Debug: Found orders:', allOrders.length);
    console.log('🔍 Debug: Found history orders:', allHistoryOrders.length);

    // Group orders by orderIdentifier to find exact duplicates
    const orderIdentifierGroups = new Map();
    allOrders.forEach((order: any) => {
      if (!orderIdentifierGroups.has(order.orderIdentifier)) {
        orderIdentifierGroups.set(order.orderIdentifier, []);
      }
      orderIdentifierGroups.get(order.orderIdentifier).push(order);
    });

    // Find exact duplicates (same orderIdentifier)
    const exactDuplicates = [];
    orderIdentifierGroups.forEach((orders: any[], identifier: string) => {
      if (orders.length > 1) {
        // Keep the first one, mark others as duplicates
        exactDuplicates.push(...orders.slice(1));
        console.log(`🔍 Debug: Found exact duplicates for identifier ${identifier}:`, orders.length);
      }
    });

    // Group orders by userId and createdAt (within 1 minute) for time-based duplicates
    const timeBasedGroups = new Map();
    allOrders.forEach((order: any) => {
      const key = `${order.userId}_${Math.floor(new Date(order.createdAt).getTime() / 60000)}`;
      if (!timeBasedGroups.has(key)) {
        timeBasedGroups.set(key, []);
      }
      timeBasedGroups.get(key).push(order);
    });

    // Find time-based duplicates (more than 1 order in the same minute)
    const timeBasedDuplicates = [];
    timeBasedGroups.forEach((orders: any[], key: string) => {
      if (orders.length > 1) {
        // Keep the first one, mark others as duplicates
        timeBasedDuplicates.push(...orders.slice(1));
        console.log(`🔍 Debug: Found time-based duplicates for key ${key}:`, orders.length);
      }
    });

    // Combine and deduplicate the duplicate lists
    const allDuplicates = [...new Set([...exactDuplicates, ...timeBasedDuplicates])];
    console.log('🔍 Debug: Total duplicate orders found:', allDuplicates.length);

    // Delete duplicate orders
    let deletedCount = 0;
    for (const duplicate of allDuplicates) {
      try {
        await writeClient.delete(duplicate._id);
        deletedCount++;
        console.log('🔍 Debug: Deleted duplicate order:', duplicate._id, 'Identifier:', duplicate.orderIdentifier);
      } catch (error) {
        console.error('🔍 Debug: Failed to delete duplicate order:', duplicate._id, error);
      }
    }

    // Clean up orphaned history records (no corresponding order)
    const orphanedHistory = allHistoryOrders.filter((history: any) => {
      return !allOrders.some((order: any) => order._id === history.originalOrderId);
    });

    console.log('🔍 Debug: Found orphaned history records:', orphanedHistory.length);

    // Delete orphaned history records
    let deletedHistoryCount = 0;
    for (const orphaned of orphanedHistory) {
      try {
        await writeClient.delete(orphaned._id);
        deletedHistoryCount++;
        console.log('🔍 Debug: Deleted orphaned history record:', orphaned._id);
      } catch (error) {
        console.error('🔍 Debug: Failed to delete orphaned history record:', orphaned._id, error);
      }
    }

    // Find and clean up old pending orders (older than 5 minutes)
    const cutoffTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const oldPendingOrders = await client.fetch(`
      *[_type == "order" && paymentStatus == false && isArchived == false && createdAt < $cutoffTime] {
        _id,
        userId,
        orderIdentifier,
        createdAt,
        paymentMethod
      }
    `, { cutoffTime });

    console.log('🔍 Debug: Found old pending orders:', oldPendingOrders.length);

    let deletedPendingCount = 0;
    for (const pending of oldPendingOrders) {
      try {
        await writeClient.delete(pending._id);
        deletedPendingCount++;
        console.log('🔍 Debug: Deleted old pending order:', pending._id, 'Identifier:', pending.orderIdentifier);
      } catch (error) {
        console.error('🔍 Debug: Failed to delete old pending order:', pending._id, error);
      }
    }

    console.log('🔍 Debug: Cleanup completed successfully');
    console.log('🔍 Debug: Summary:');
    console.log(`  - Duplicate orders deleted: ${deletedCount}`);
    console.log(`  - Orphaned history records deleted: ${deletedHistoryCount}`);
    console.log(`  - Old pending orders deleted: ${deletedPendingCount}`);
    console.log(`  - Total records cleaned: ${deletedCount + deletedHistoryCount + deletedPendingCount}`);

    return NextResponse.json({
      success: true,
      message: 'Duplicate cleanup completed successfully',
      summary: {
        duplicateOrdersDeleted: deletedCount,
        orphanedHistoryDeleted: deletedHistoryCount,
        oldPendingOrdersDeleted: deletedPendingCount,
        totalCleaned: deletedCount + deletedHistoryCount + deletedPendingCount
      }
    });

  } catch (error) {
    console.error('🔍 Debug: Error during cleanup:', error);
    return NextResponse.json({
      error: 'Failed to cleanup duplicates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}