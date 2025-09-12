import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';

/**
 * GET /api/food-items
 * Fetches food items with optional filtering
 * 
 * Query Params:
 * - shopId: Filter by shop ID
 * - category: Filter by category
 * - search: Search in food name and description
 * - limit: Number of items to return (default: 50)
 * - offset: Number of items to skip (default: 0)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get('shopId');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `*[_type == "foodItem"`;
    const params: any = {};

    if (shopId) {
      query += ` && shopRef._ref == $shopId`;
      params.shopId = shopId;
    }

    if (category) {
      query += ` && category == $category`;
      params.category = category;
    }

    if (search) {
      query += ` && (foodName match $search || description match $search)`;
      params.search = `*${search}*`;
    }

    query += `] | order(_createdAt desc) [${offset}...${offset + limit}] {
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
        location
      }
    }`;

    const foodItems = await client.fetch(query, params);
    const totalCount = await client.fetch(
      `count(*[_type == "foodItem"${shopId ? ' && shopRef._ref == $shopId' : ''}${category ? ' && category == $category' : ''}${search ? ' && (foodName match $search || description match $search)' : ''}])`,
      params
    );

    return NextResponse.json({
      success: true,
      foodItems,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Food items fetch error:', err);
    return NextResponse.json({ 
      error: 'Failed to fetch food items',
      details: err.message 
    }, { status: 500 });
  }
}

/**
 * POST /api/food-items
 * Creates a new food item
 */
export async function POST(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const body = await req.json();
    const {
      foodName,
      shopRef,
      image,
      category,
      price,
      foodType,
      quantity,
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
      fat
    } = body;

    // Validate required fields
    if (!foodName || !shopRef || !price) {
      return NextResponse.json({ 
        error: 'Missing required fields: foodName, shopRef, and price are required' 
      }, { status: 400 });
    }

    const foodItem = await writeClient.create({
      _type: 'foodItem',
      foodName,
      shopRef: { _type: 'reference', _ref: shopRef },
      image: image ? {
        _type: 'image',
        asset: { _type: 'reference', _ref: image }
      } : undefined,
      category,
      price: Number(price),
      foodType,
      quantity: quantity ? Number(quantity) : undefined,
      description,
      ingredients: ingredients || [],
      allergens: allergens || [],
      preparationTime: preparationTime ? Number(preparationTime) : undefined,
      rating: rating ? Number(rating) : undefined,
      reviews: reviews ? Number(reviews) : undefined,
      spicyLevel: spicyLevel ? Number(spicyLevel) : undefined,
      isVegetarian: Boolean(isVegetarian),
      isVegan: Boolean(isVegan),
      calories: calories ? Number(calories) : undefined,
      protein: protein ? Number(protein) : undefined,
      carbs: carbs ? Number(carbs) : undefined,
      fat: fat ? Number(fat) : undefined,
    });

    return NextResponse.json({ 
      success: true, 
      foodItem 
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Food item creation error:', err);
    return NextResponse.json({ 
      error: 'Failed to create food item',
      details: err.message 
    }, { status: 500 });
  }
}
