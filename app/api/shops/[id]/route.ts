import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';

/**
 * GET /api/shops/[id]
 * Fetches a specific shop by ID with its food items
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const shop = await client.fetch(
      `*[_type == "shop" && _id == $id][0] {
        _id,
        shopName,
        description,
        location,
        contactInfo,
        operatingHours,
        rating,
        totalReviews,
        isActive,
        image {
          asset->{
            _id,
            url
          }
        },
        "foodItems": *[_type == "foodItem" && shopRef._ref == $id] {
          _id,
          foodName,
          price,
          category,
          foodType,
          description,
          rating,
          reviews,
          isVegetarian,
          isVegan,
          image {
            asset->{
              _id,
              url
            }
          }
        }
      }`,
      { id }
    );

    if (!shop) {
      return NextResponse.json({ 
        error: 'Shop not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      shop 
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Shop fetch error:', err);
    return NextResponse.json({ 
      error: 'Failed to fetch shop',
      details: err.message 
    }, { status: 500 });
  }
}

/**
 * PUT /api/shops/[id]
 * Updates a specific shop
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const { id } = params;
    const body = await req.json();

    // Check if shop exists
    const existingShop = await client.fetch(
      `*[_type == "shop" && _id == $id][0]`,
      { id }
    );

    if (!existingShop) {
      return NextResponse.json({ 
        error: 'Shop not found' 
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    
    if (body.shopName !== undefined) updateData.shopName = body.shopName;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.contactInfo !== undefined) updateData.contactInfo = body.contactInfo;
    if (body.operatingHours !== undefined) updateData.operatingHours = body.operatingHours;
    if (body.rating !== undefined) updateData.rating = Number(body.rating);
    if (body.totalReviews !== undefined) updateData.totalReviews = Number(body.totalReviews);
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
    if (body.image !== undefined) {
      updateData.image = body.image ? {
        _type: 'image',
        asset: { _type: 'reference', _ref: body.image }
      } : null;
    }

    const updatedShop = await writeClient
      .patch(id)
      .set(updateData)
      .commit();

    return NextResponse.json({ 
      success: true, 
      shop: updatedShop 
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Shop update error:', err);
    return NextResponse.json({ 
      error: 'Failed to update shop',
      details: err.message 
    }, { status: 500 });
  }
}

/**
 * DELETE /api/shops/[id]
 * Deletes a specific shop (only if no food items exist)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const { id } = params;

    // Check if shop exists
    const existingShop = await client.fetch(
      `*[_type == "shop" && _id == $id][0]`,
      { id }
    );

    if (!existingShop) {
      return NextResponse.json({ 
        error: 'Shop not found' 
      }, { status: 404 });
    }

    // Check if shop has any food items
    const foodItems = await client.fetch(
      `*[_type == "foodItem" && shopRef._ref == $id]`,
      { id }
    );

    if (foodItems.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete shop that has food items',
        foodItemsCount: foodItems.length
      }, { status: 400 });
    }

    // Check if shop has any cart items
    const cartItems = await client.fetch(
      `*[_type == "cartItem" && foodId->shopRef._ref == $id]`,
      { id }
    );

    if (cartItems.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete shop that has items in active carts',
        cartItemsCount: cartItems.length
      }, { status: 400 });
    }

    await writeClient.delete(id);

    return NextResponse.json({ 
      success: true, 
      message: 'Shop deleted successfully' 
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Shop deletion error:', err);
    return NextResponse.json({ 
      error: 'Failed to delete shop',
      details: err.message 
    }, { status: 500 });
  }
}
