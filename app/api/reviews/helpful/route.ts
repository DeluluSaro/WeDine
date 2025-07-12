import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/sanity/lib/client';

export async function POST(request: NextRequest) {
  try {
    console.log("=== HELPFUL VOTE API REQUEST ===");
    
    const body = await request.json();
    console.log("Request body:", body);
    
    const { reviewId, action } = body; // action: 'increment' or 'decrement'

    if (!reviewId || !action) {
      console.error("Missing required fields:", { reviewId, action });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['increment', 'decrement'].includes(action)) {
      console.error("Invalid action:", action);
      return NextResponse.json(
        { error: 'Invalid action. Must be "increment" or "decrement"' },
        { status: 400 }
      );
    }

    // Get current review to check helpful count
    const currentReview = await writeClient.fetch(
      `*[_type == "review" && _id == $reviewId][0] { helpfulCount }`,
      { reviewId }
    );

    if (!currentReview) {
      console.error("Review not found:", reviewId);
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    const currentCount = currentReview.helpfulCount || 0;
    const newCount = action === 'increment' ? currentCount + 1 : Math.max(0, currentCount - 1);

    // Update the review with new helpful count
    const updatedReview = await writeClient
      .patch(reviewId)
      .set({ helpfulCount: newCount })
      .commit();

    console.log('Review updated successfully:', updatedReview);

    return NextResponse.json({
      success: true,
      message: `Helpful count ${action === 'increment' ? 'incremented' : 'decremented'} successfully`,
      helpfulCount: newCount,
      reviewId: updatedReview._id
    });

  } catch (error) {
    console.error('❌ Error updating helpful count:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Failed to update helpful count',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 