import { NextRequest, NextResponse } from 'next/server';
import { writeClient, client } from '@/sanity/lib/client';

interface CleanupStats {
  expiredOrders: number;
  activeOrders: number;
  historyRecords: number;
  lastCheck: string;
}

interface CleanupResult {
  success: boolean;
  message: string;
  processed: number;
  errors?: string[];
  stats?: CleanupStats;
  executionTime?: number;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[${timestamp}] Cleanup process started`);
    
    // Get current timestamp
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    console.log(`[${timestamp}] Looking for orders older than: ${twentyFourHoursAgo.toISOString()}`);

    // Find all orders that are older than 24 hours and not yet archived
    const expiredOrders = await client.fetch(`
      *[_type == "order" && createdAt < $twentyFourHoursAgo && isArchived != true] {
        _id,
        userId,
        orderId,
        userEmail,
        foodId,
        foodName,
        shopName,
        quantityOrdered,
        items,
        total,
        paymentMethod,
        status,
        createdAt,
        updatedAt,
        paymentStatus,
        expiresAt
      }
    `, { twentyFourHoursAgo: twentyFourHoursAgo.toISOString() });

    console.log(`[${timestamp}] Found ${expiredOrders.length} expired orders`);

    if (expiredOrders.length === 0) {
      const executionTime = Date.now() - startTime;
      console.log(`[${timestamp}] No expired orders found, cleanup completed in ${executionTime}ms`);
      
      return NextResponse.json({ 
        success: true, 
        message: 'No expired orders found',
        processed: 0,
        executionTime
      });
    }

    let processedCount = 0;
    const errors: string[] = [];

    // Process each expired order with transaction safety
    for (const order of expiredOrders) {
      try {
        console.log(`[${timestamp}] Processing order ${order._id}`);
        
        // Check if history record already exists (prevent duplicates)
        const existingHistory = await client.fetch(`
          *[_type == "orderHistory" && originalOrderId == $orderId][0]
        `, { orderId: order._id });

        if (existingHistory) {
          console.log(`[${timestamp}] History record already exists for order ${order._id}, skipping`);
          continue;
        }

        // Create history record
        const historyRecord = {
          _type: 'orderHistory',
          userId: order.userId,
          orderId: order.orderId,
          userEmail: order.userEmail,
          foodId: order.foodId,
          foodName: order.foodName,
          shopName: order.shopName,
          quantityOrdered: order.quantityOrdered,
          items: order.items,
          total: order.total,
          paymentMethod: order.paymentMethod,
          status: order.status,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          paymentStatus: order.paymentStatus,
          archivedAt: now.toISOString(),
          originalOrderId: order._id,
          lifecycleNotes: `Automatically archived after 24 hours on ${now.toISOString()}`
        };

        // Insert into history
        await writeClient.create(historyRecord);
        console.log(`[${timestamp}] Created history record for order ${order._id}`);

        // Mark original order as archived
        await writeClient
          .patch(order._id)
          .set({ 
            isArchived: true, 
            archivedAt: now.toISOString() 
          })
          .commit();
        console.log(`[${timestamp}] Marked order ${order._id} as archived`);

        // Delete the original order
        await writeClient.delete(order._id);
        console.log(`[${timestamp}] Deleted order ${order._id}`);

        processedCount++;
        
      } catch (error) {
        const errorMsg = `Failed to process order ${order._id}: ${error}`;
        errors.push(errorMsg);
        console.error(`[${timestamp}] ${errorMsg}`);
      }
    }

    const executionTime = Date.now() - startTime;
    
    console.log(`[${timestamp}] Cleanup completed:`, {
      processed: processedCount,
      errors: errors.length,
      executionTime: `${executionTime}ms`
    });

    const result: CleanupResult = {
      success: true,
      message: `Processed ${processedCount} expired orders`,
      processed: processedCount,
      errors: errors.length > 0 ? errors : undefined,
      executionTime
    };

    return NextResponse.json(result);

  } catch (error: unknown) {
    const executionTime = Date.now() - startTime;
    const err = error as Error;
    
    console.error(`[${timestamp}] Cleanup error:`, {
      error: err.message,
      stack: err.stack,
      executionTime: `${executionTime}ms`
    });
    
    return NextResponse.json({ 
      success: false,
      message: 'Cleanup process failed',
      processed: 0,
      errors: [err.message],
      executionTime
    }, { status: 500 });
  }
}

// GET endpoint to check cleanup status
export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    console.log(`[${now.toISOString()}] Fetching cleanup statistics`);

    // Count expired orders
    const expiredCount = await client.fetch(`
      count(*[_type == "order" && createdAt < $twentyFourHoursAgo && isArchived != true])
    `, { twentyFourHoursAgo: twentyFourHoursAgo.toISOString() });

    // Count total active orders
    const activeCount = await client.fetch(`
      count(*[_type == "order" && isArchived != true])
    `);

    // Count total history records
    const historyCount = await client.fetch(`
      count(*[_type == "orderHistory"])
    `);

    const stats: CleanupStats = {
      expiredOrders: expiredCount,
      activeOrders: activeCount,
      historyRecords: historyCount,
      lastCheck: now.toISOString()
    };

    console.log(`[${now.toISOString()}] Statistics:`, stats);

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[${new Date().toISOString()}] Error fetching stats:`, err.message);
    
    return NextResponse.json({ 
      success: false,
      error: err.message 
    }, { status: 500 });
  }
}