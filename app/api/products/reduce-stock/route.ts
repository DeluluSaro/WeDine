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

    console.log('🔍 Debug: Stock reduction request received:', items);

    if (!items || items.length === 0) {
      console.log('🔍 Debug: No items provided for stock reduction');
      return NextResponse.json({ error: 'Items are required' }, { status: 400 });
    }

    const stockUpdates = [];
    const errors = [];

    // Process each item for stock reduction
    for (const item of items) {
      try {
        console.log(`🔍 Debug: Processing stock reduction for item: ${item.foodId}, quantity: ${item.quantity}`);
        
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
          console.error(`🔍 Debug: Food item ${item.foodId} not found`);
          errors.push(`Food item ${item.foodId} not found`);
          continue;
        }

        const currentStock = foodItem.quantity || 0;
        console.log(`🔍 Debug: Current stock for ${foodItem.foodName}: ${currentStock}`);
        
        // Validate stock availability
        if (currentStock < item.quantity) {
          console.error(`🔍 Debug: Insufficient stock for ${foodItem.foodName}. Available: ${currentStock}, Requested: ${item.quantity}`);
          errors.push(`Insufficient stock for ${foodItem.foodName}. Available: ${currentStock}, Requested: ${item.quantity}`);
          continue;
        }
        
        const newStock = Math.max(0, currentStock - item.quantity);
        console.log(`🔍 Debug: Reducing stock for ${foodItem.foodName}: ${currentStock} → ${newStock}`);

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

        console.log(`✅ Stock updated for ${foodItem.foodName}: ${currentStock} → ${newStock}`);

      } catch (error) {
        console.error(`🔍 Debug: Error updating stock for item ${item.foodId}:`, error);
        errors.push(`Failed to update stock for ${item.foodId}`);
      }
    }

    if (errors.length > 0) {
      console.log('🔍 Debug: Stock reduction completed with errors:', errors);
      return NextResponse.json({
        success: false,
        message: 'Some stock updates failed',
        errors: errors,
        successfulUpdates: stockUpdates
      }, { status: 207 }); // 207 Multi-Status
    }

    console.log('🔍 Debug: Stock reduction completed successfully:', stockUpdates);
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