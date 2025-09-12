import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';

/**
 * GET /api/reviews
 * Fetches reviews with optional filtering
 * 
 * Query Params:
 * - foodItemId: Filter by food item ID
 * - shopId: Filter by shop ID
 * - userId: Filter by user ID
 * - rating: Filter by minimum rating
 * - limit: Number of items to return (default: 50)
 * - offset: Number of items to skip (default: 0)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const foodItemId = searchParams.get('foodItemId');
    const shopId = searchParams.get('shopId');
    const userId = searchParams.get('userId');
    const rating = searchParams.get('rating');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `*[_type == "review"`;
    const params: any = {};

    if (foodItemId) {
      query += ` && foodItem._ref == $foodItemId`;
      params.foodItemId = foodItemId;
    }

    if (shopId) {
      query += ` && shop._ref == $shopId`;
      params.shopId = shopId;
    }

    if (userId) {
      query += ` && userId == $userId`;
      params.userId = userId;
    }

    if (rating) {
      query += ` && rating >= $rating`;
      params.rating = Number(rating);
    }

    query += `] | order(_createdAt desc) [${offset}...${offset + limit}] {
      _id,
      userId,
      userName,
      rating,
      comment,
      helpfulVotes,
      createdAt,
      foodItem->{
        _id,
        foodName,
        image {
          asset->{
            _id,
            url
          }
        }
      },
      shop->{
        _id,
        shopName
      }
    }`;

    const reviews = await client.fetch(query, params);
    const totalCount = await client.fetch(
      `count(*[_type == "review"${foodItemId ? ' && foodItem._ref == $foodItemId' : ''}${shopId ? ' && shop._ref == $shopId' : ''}${userId ? ' && userId == $userId' : ''}${rating ? ' && rating >= $rating' : ''}])`,
      params
    );

    return NextResponse.json({
      success: true,
      reviews,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Reviews fetch error:', err);
    return NextResponse.json({ 
      error: 'Failed to fetch reviews',
      details: err.message 
    }, { status: 500 });
  }
}

/**
 * POST /api/reviews
 * Creates a new review
 */
export async function POST(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const body = await req.json();
    const {
      userId,
      userName,
      foodItemId,
      shopId,
      rating,
      comment
    } = body;

    // Validate required fields
    if (!userId || !userName || !foodItemId || !shopId || !rating) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, userName, foodItemId, shopId, and rating are required' 
      }, { status: 400 });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ 
        error: 'Rating must be between 1 and 5' 
      }, { status: 400 });
    }

    // Check if user has already reviewed this food item
    const existingReview = await client.fetch(
      `*[_type == "review" && userId == $userId && foodItem._ref == $foodItemId][0]`,
      { userId, foodItemId }
    );

    if (existingReview) {
      return NextResponse.json({ 
        error: 'You have already reviewed this food item' 
      }, { status: 400 });
    }

    // Create the review
    const review = await writeClient.create({
      _type: 'review',
      userId,
      userName,
      foodItem: { _type: 'reference', _ref: foodItemId },
      shop: { _type: 'reference', _ref: shopId },
      rating: Number(rating),
      comment: comment || '',
      helpfulVotes: 0,
      createdAt: new Date().toISOString(),
    });

    // Update food item rating and review count
    try {
      const foodItem = await client.fetch(
        `*[_type == "foodItem" && _id == $foodItemId][0]`,
        { foodItemId }
      );

      if (foodItem) {
        const currentRating = foodItem.rating || 0;
        const currentReviews = foodItem.reviews || 0;
        const newRating = ((currentRating * currentReviews) + rating) / (currentReviews + 1);

        await writeClient
          .patch(foodItemId)
          .set({
            rating: Math.round(newRating * 10) / 10, // Round to 1 decimal place
            reviews: currentReviews + 1
          })
          .commit();
      }
    } catch (updateError) {
      console.error('Failed to update food item rating:', updateError);
      // Don't fail the review creation if rating update fails
    }

    return NextResponse.json({ 
      success: true, 
      review 
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Review creation error:', err);
    return NextResponse.json({ 
      error: 'Failed to create review',
      details: err.message 
    }, { status: 500 });
  }
}