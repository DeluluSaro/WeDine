import { NextRequest, NextResponse } from 'next/server';
import { writeClient, client } from '@/sanity/lib/client';

interface StockReductionRequest {
  items: Array<{
    foodId: string;
    quantity: number;
  }>;
}

export async function PUT(req: NextRequest) {
  try {
    const { items }: StockReductionRequest = await req.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Items are required' }, { status: 400 });
    }

    const stockUpdates = [];
    const errors = [];

    // Process each item for stock reduction
    for (const item of items) {
      try {
        // Fetch current stock for the food item
        const foodItem = await client.fetch(`
          *[_type == "foodItem" && _id == $foodId][0] {
            _id,
            foodName,
            quantity,
            price
          }
        `, { foodId: item.foodId });

        if (!foodItem) {
          errors.push(`Food item ${item.foodId} not found`);
          continue;
        }

        const currentStock = foodItem.quantity || 0;
        
        // Validate stock availability
        if (currentStock < item.quantity) {
          errors.push(`Insufficient stock for ${foodItem.foodName}. Available: ${currentStock}, Requested: ${item.quantity}`);
          continue;
        }
        
        const newStock = Math.max(0, currentStock - item.quantity);

        // Update stock in Sanity
        const updatedItem = await writeClient
          .patch(foodItem._id)
          .set({
            quantity: newStock,
            updatedAt: new Date().toISOString()
          })
          .commit();

        stockUpdates.push({
          foodId: item.foodId,
          foodName: foodItem.foodName,
          previousStock: currentStock,
          newStock: newStock,
          reducedBy: item.quantity
        });

        console.log(`Stock updated for ${foodItem.foodName}: ${currentStock} → ${newStock}`);

      } catch (error) {
        console.error(`Error updating stock for item ${item.foodId}:`, error);
        errors.push(`Failed to update stock for ${item.foodId}`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Some stock updates failed',
        errors: errors,
        successfulUpdates: stockUpdates
      }, { status: 207 }); // 207 Multi-Status
    }

    return NextResponse.json({
      success: true,
      message: 'Stock updated successfully',
      updates: stockUpdates
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error reducing stock:', err);
    return NextResponse.json({ 
      error: 'Failed to reduce stock', 
      details: err.message 
    }, { status: 500 });
  }
}