import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';

/**
 * GET /api/food-items/[id]
 * Fetches a specific food item by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const foodItem = await client.fetch(
      `*[_type == "foodItem" && _id == $id][0] {
        _id,
        foodName,
        price,
        category,
        foodType,
        description,
        ingredients,
        allergens,
        preparationTime,
        rating,
        reviews,
        spicyLevel,
        isVegetarian,
        isVegan,
        calories,
        protein,
        carbs,
        fat,
        quantity,
        image {
          asset->{
            _id,
            url
          }
        },
        shopRef->{
          _id,
          shopName,
          location,
          description
        }
      }`,
      { id }
    );

    if (!foodItem) {
      return NextResponse.json({ 
        error: 'Food item not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      foodItem 
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Food item fetch error:', err);
    return NextResponse.json({ 
      error: 'Failed to fetch food item',
      details: err.message 
    }, { status: 500 });
  }
}

/**
 * PUT /api/food-items/[id]
 * Updates a specific food item
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const { id } = await params;
    const body = await req.json();

    // Check if food item exists
    const existingItem = await client.fetch(
      `*[_type == "foodItem" && _id == $id][0]`,
      { id }
    );

    if (!existingItem) {
      return NextResponse.json({ 
        error: 'Food item not found' 
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    
    if (body.foodName !== undefined) updateData.foodName = body.foodName;
    if (body.shopRef !== undefined) updateData.shopRef = { _type: 'reference', _ref: body.shopRef };
    if (body.image !== undefined) {
      updateData.image = body.image ? {
        _type: 'image',
        asset: { _type: 'reference', _ref: body.image }
      } : null;
    }
    if (body.category !== undefined) updateData.category = body.category;
    if (body.price !== undefined) updateData.price = Number(body.price);
    if (body.foodType !== undefined) updateData.foodType = body.foodType;
    if (body.quantity !== undefined) updateData.quantity = body.quantity ? Number(body.quantity) : null;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.ingredients !== undefined) updateData.ingredients = body.ingredients || [];
    if (body.allergens !== undefined) updateData.allergens = body.allergens || [];
    if (body.preparationTime !== undefined) updateData.preparationTime = body.preparationTime ? Number(body.preparationTime) : null;
    if (body.rating !== undefined) updateData.rating = body.rating ? Number(body.rating) : null;
    if (body.reviews !== undefined) updateData.reviews = body.reviews ? Number(body.reviews) : null;
    if (body.spicyLevel !== undefined) updateData.spicyLevel = body.spicyLevel ? Number(body.spicyLevel) : null;
    if (body.isVegetarian !== undefined) updateData.isVegetarian = Boolean(body.isVegetarian);
    if (body.isVegan !== undefined) updateData.isVegan = Boolean(body.isVegan);
    if (body.calories !== undefined) updateData.calories = body.calories ? Number(body.calories) : null;
    if (body.protein !== undefined) updateData.protein = body.protein ? Number(body.protein) : null;
    if (body.carbs !== undefined) updateData.carbs = body.carbs ? Number(body.carbs) : null;
    if (body.fat !== undefined) updateData.fat = body.fat ? Number(body.fat) : null;

    const updatedItem = await writeClient
      .patch(id)
      .set(updateData)
      .commit();

    return NextResponse.json({ 
      success: true, 
      foodItem: updatedItem 
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Food item update error:', err);
    return NextResponse.json({ 
      error: 'Failed to update food item',
      details: err.message 
    }, { status: 500 });
  }
}

/**
 * DELETE /api/food-items/[id]
 * Deletes a specific food item
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const { id } = await params;

    // Check if food item exists
    const existingItem = await client.fetch(
      `*[_type == "foodItem" && _id == $id][0]`,
      { id }
    );

    if (!existingItem) {
      return NextResponse.json({ 
        error: 'Food item not found' 
      }, { status: 404 });
    }

    // Check if food item is in any active carts
    const cartItems = await client.fetch(
      `*[_type == "cartItem" && foodId._ref == $id]`,
      { id }
    );

    if (cartItems.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete food item that is in active carts',
        cartItemsCount: cartItems.length
      }, { status: 400 });
    }

    await writeClient.delete(id);

    return NextResponse.json({ 
      success: true, 
      message: 'Food item deleted successfully' 
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Food item deletion error:', err);
    return NextResponse.json({ 
      error: 'Failed to delete food item',
      details: err.message 
    }, { status: 500 });
  }
}
