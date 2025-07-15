import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';

export async function POST(request: NextRequest) {
  try {
    console.log("=== REVIEW API POST REQUEST ===");
    
    const body = await request.json();
    console.log("Request body:", body);
    
    const { userName, userEmail, shopId, rating, reviewText } = body;

    console.log("Extracted data:");
    console.log("- userName:", userName);
    console.log("- userEmail:", userEmail);
    console.log("- shopId:", shopId);
    console.log("- rating:", rating);
    console.log("- reviewText:", reviewText);

    // Validation
    if (!userName || !userEmail || !shopId || !rating || !reviewText) {
      console.error("Missing required fields:", { userName, userEmail, shopId, rating, reviewText });
      return NextResponse.json(
        { error: 'Missing required fields', details: { userName: !!userName, userEmail: !!userEmail, shopId: !!shopId, rating: !!rating, reviewText: !!reviewText } },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      console.error("Invalid rating:", rating);
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    if (reviewText.length < 10 || reviewText.length > 500) {
      console.error("Invalid review text length:", reviewText.length);
      return NextResponse.json(
        { error: 'Review text must be between 10 and 500 characters' },
        { status: 400 }
      );
    }

    // Create review document
    const reviewDoc = {
      _type: 'review',
      userName,
      userEmail,
      shopRef: {
        _type: 'reference',
        _ref: shopId
      },
      rating,
      reviewText,
      createdAt: new Date().toISOString(),
      isVerified: false,
      helpfulCount: 0
    };

    console.log("Review document to create:", reviewDoc);

    // Insert into Sanity
    console.log("Attempting to create review in Sanity...");
    console.log("Using write client with token:", !!process.env.SANITY_API_TOKEN);
    const result = await writeClient.create(reviewDoc);

    console.log('Review created successfully:', result);

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully',
      reviewId: result._id
    });

  } catch (error) {
    console.error('❌ Error creating review:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // More detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error name:', error.name);
    }
    
    // Check for specific Sanity errors
    let errorMessage = 'Failed to submit review';
    let errorDetails = error instanceof Error ? error.message : 'Unknown error';
    
    if (error instanceof Error) {
      if (error.message.includes('token')) {
        errorMessage = 'Authentication failed - check Sanity API token';
        errorDetails = 'Missing or invalid SANITY_API_TOKEN in environment variables';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Permission denied - token lacks write access';
        errorDetails = 'API token needs write permissions for reviews';
      } else if (error.message.includes('schema')) {
        errorMessage = 'Schema error - review type not found';
        errorDetails = 'Review schema might not be properly registered';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        debug: {
          hasToken: !!process.env.SANITY_API_TOKEN,
          tokenLength: process.env.SANITY_API_TOKEN?.length || 0,
          projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
          dataset: process.env.NEXT_PUBLIC_SANITY_DATASET
        }
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("=== REVIEW API GET REQUEST ===");
    
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const page = parseInt(searchParams.get('page') || '1');
    const sort = searchParams.get('sort') || 'newest';
    const filter = searchParams.get('filter') || 'all';
    
    console.log("Query parameters:", { shopId, page, sort, filter });

    const REVIEWS_PER_PAGE = 10;
    const offset = (page - 1) * REVIEWS_PER_PAGE;

    // Build sort query
    let sortQuery = '';
    switch (sort) {
      case 'newest':
        sortQuery = '| order(createdAt desc)';
        break;
      case 'rating':
        sortQuery = '| order(rating desc, createdAt desc)';
        break;
      case 'helpful':
        sortQuery = '| order(helpfulCount desc, createdAt desc)';
        break;
      default:
        sortQuery = '| order(createdAt desc)';
    }

    // Build filter query
    let filterQuery = '';
    if (filter !== 'all') {
      const rating = parseInt(filter);
      if (!isNaN(rating) && rating >= 1 && rating <= 5) {
        filterQuery = `&& rating == ${rating}`;
      }
    }

    // Build shop filter
    let shopFilter = '';
    if (shopId) {
      shopFilter = `&& shopRef._ref == $shopId`;
    }

    // Fetch reviews with pagination
    const query = `*[_type == "review" ${shopFilter} ${filterQuery}] ${sortQuery} [${offset}...${offset + REVIEWS_PER_PAGE}] {
      _id,
      userName,
      userEmail,
      rating,
      reviewText,
      createdAt,
      isVerified,
      helpfulCount,
      shopRef->{
        _id,
        shopName
      }
    }`;

    console.log("Executing query:", query);
    console.log("Query parameters:", { shopId, offset, REVIEWS_PER_PAGE });

    const reviews = await client.fetch(query, { shopId, offset, REVIEWS_PER_PAGE });
    console.log("Fetched reviews:", reviews);

    // Get total count for stats
    const totalQuery = `count(*[_type == "review" ${shopFilter} ${filterQuery}])`;
    const totalReviews = await client.fetch(totalQuery, { shopId });

    // Get all reviews for stats calculation (without pagination)
    const statsQuery = `*[_type == "review" ${shopFilter}] {
      rating,
      helpfulCount
    }`;
    const allReviews = await client.fetch(statsQuery, { shopId });

    // Calculate average rating and distribution
    const averageRating = allReviews.length > 0 
      ? allReviews.reduce((sum: number, review: unknown) => sum + (review as { rating: number }).rating, 0) / allReviews.length 
      : 0;

    const response = {
      success: true,
      reviews,
      stats: {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        ratingDistribution: {
          5: allReviews.filter((r: unknown) => (r as { rating: number }).rating === 5).length,
          4: allReviews.filter((r: unknown) => (r as { rating: number }).rating === 4).length,
          3: allReviews.filter((r: unknown) => (r as { rating: number }).rating === 3).length,
          2: allReviews.filter((r: unknown) => (r as { rating: number }).rating === 2).length,
          1: allReviews.filter((r: unknown) => (r as { rating: number }).rating === 1).length,
        }
      },
      pagination: {
        page,
        hasMore: reviews.length === REVIEWS_PER_PAGE,
        totalPages: Math.ceil(totalReviews / REVIEWS_PER_PAGE)
      }
    };

    console.log("Response data:", response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error fetching reviews:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch reviews',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 