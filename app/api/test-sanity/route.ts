import { NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';

export async function GET() {
  try {
    console.log("=== TEST SANITY API ===");
    
    // Test 1: Check if client is working
    console.log("Testing Sanity client...");
    
    // Test 2: Try to fetch some shops
    console.log("Fetching shops...");
    const shops = await client.fetch(`*[_type == "shop"]{_id, shopName}`);
    console.log("Shops found:", shops);
    
    // Test 3: Try to create a test document
    console.log("Creating test document...");
    const testDoc = {
      _type: 'review',
      userName: 'Test User',
      userEmail: 'test@example.com',
      shopRef: {
        _type: 'reference',
        _ref: shops[0]?._id || 'test-shop-id'
      },
      rating: 5,
      reviewText: 'This is a test review to verify Sanity is working correctly.',
      createdAt: new Date().toISOString(),
      isVerified: false,
      helpfulCount: 0
    };
    
    console.log("Test document to create:", testDoc);
    
    const result = await writeClient.create(testDoc);
    console.log("Test document created:", result);
    
    // Test 4: Fetch the created document
    console.log("Fetching created document...");
    const fetchedDoc = await client.fetch(`*[_type == "review" && _id == $id][0]`, { id: result._id });
    console.log("Fetched document:", fetchedDoc);
    
    return NextResponse.json({
      success: true,
      message: 'Sanity test successful',
      shops,
      createdDoc: result,
      fetchedDoc
    });
    
  } catch (error) {
    console.error('❌ Sanity test failed:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json({
      success: false,
      error: 'Sanity test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 