import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';

/**
 * GET /api/shops
 * Fetches shops with optional filtering
 * 
 * Query Params:
 * - search: Search in shop name and description
 * - location: Filter by location
 * - limit: Number of items to return (default: 50)
 * - offset: Number of items to skip (default: 0)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const location = searchParams.get('location');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `*[_type == "shop"`;
    const params: any = {};

    if (search) {
      query += ` && (shopName match $search || description match $search)`;
      params.search = `*${search}*`;
    }

    if (location) {
      query += ` && location match $location`;
      params.location = `*${location}*`;
    }

    query += `] | order(_createdAt desc) [${offset}...${offset + limit}] {
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
      "foodItemsCount": count(*[_type == "foodItem" && shopRef._ref == ^._id])
    }`;

    const shops = await client.fetch(query, params);
    const totalCount = await client.fetch(
      `count(*[_type == "shop"${search ? ' && (shopName match $search || description match $search)' : ''}${location ? ' && location match $location' : ''}])`,
      params
    );

    return NextResponse.json({
      success: true,
      shops,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Shops fetch error:', err);
    return NextResponse.json({ 
      error: 'Failed to fetch shops',
      details: err.message 
    }, { status: 500 });
  }
}

/**
 * POST /api/shops
 * Creates a new shop
 */
export async function POST(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const body = await req.json();
    const {
      shopName,
      description,
      location,
      contactInfo,
      operatingHours,
      rating,
      totalReviews,
      isActive,
      image
    } = body;

    // Validate required fields
    if (!shopName || !location) {
      return NextResponse.json({ 
        error: 'Missing required fields: shopName and location are required' 
      }, { status: 400 });
    }

    const shop = await writeClient.create({
      _type: 'shop',
      shopName,
      description,
      location,
      contactInfo: contactInfo || {},
      operatingHours: operatingHours || {},
      rating: rating ? Number(rating) : 0,
      totalReviews: totalReviews ? Number(totalReviews) : 0,
      isActive: Boolean(isActive !== false), // Default to true
      image: image ? {
        _type: 'image',
        asset: { _type: 'reference', _ref: image }
      } : undefined,
    });

    return NextResponse.json({ 
      success: true, 
      shop 
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Shop creation error:', err);
    return NextResponse.json({ 
      error: 'Failed to create shop',
      details: err.message 
    }, { status: 500 });
  }
}
