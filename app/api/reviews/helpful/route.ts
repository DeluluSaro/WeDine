import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';

/**
 * POST /api/reviews/helpful
 * Marks a review as helpful or unhelpful
 */
export async function POST(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const body = await req.json();
    const { reviewId, userId, isHelpful } = body;

    if (!reviewId || !userId || typeof isHelpful !== 'boolean') {
      return NextResponse.json({ 
        error: 'Missing required fields: reviewId, userId, and isHelpful are required' 
      }, { status: 400 });
    }

    // Check if review exists
    const review = await client.fetch(
      `*[_type == "review" && _id == $reviewId][0]`,
      { reviewId }
    );

    if (!review) {
      return NextResponse.json({ 
        error: 'Review not found' 
      }, { status: 404 });
    }

    // Check if user has already voted on this review
    const existingVote = await client.fetch(
      `*[_type == "reviewVote" && reviewId == $reviewId && userId == $userId][0]`,
      { reviewId, userId }
    );

    let voteResult;

    if (existingVote) {
      // Update existing vote
      if (existingVote.isHelpful === isHelpful) {
        // User is removing their vote
        await writeClient.delete(existingVote._id);
        
        // Update review helpful votes count
        const newHelpfulVotes = isHelpful ? review.helpfulVotes - 1 : review.helpfulVotes + 1;
        await writeClient
          .patch(reviewId)
          .set({ helpfulVotes: Math.max(0, newHelpfulVotes) })
          .commit();

        voteResult = { action: 'removed', helpfulVotes: Math.max(0, newHelpfulVotes) };
      } else {
        // User is changing their vote
        await writeClient
          .patch(existingVote._id)
          .set({ isHelpful })
          .commit();

        // Update review helpful votes count
        const newHelpfulVotes = isHelpful ? review.helpfulVotes + 1 : review.helpfulVotes - 1;
        await writeClient
          .patch(reviewId)
          .set({ helpfulVotes: Math.max(0, newHelpfulVotes) })
          .commit();

        voteResult = { action: 'changed', helpfulVotes: Math.max(0, newHelpfulVotes) };
      }
    } else {
      // Create new vote
      await writeClient.create({
        _type: 'reviewVote',
        reviewId,
        userId,
        isHelpful,
        createdAt: new Date().toISOString()
      });

      // Update review helpful votes count
      const newHelpfulVotes = isHelpful ? review.helpfulVotes + 1 : review.helpfulVotes;
      await writeClient
        .patch(reviewId)
        .set({ helpfulVotes: newHelpfulVotes })
        .commit();

      voteResult = { action: 'added', helpfulVotes: newHelpfulVotes };
    }

    return NextResponse.json({ 
      success: true, 
      ...voteResult
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Review helpful vote error:', err);
    return NextResponse.json({ 
      error: 'Failed to update helpful vote',
      details: err.message 
    }, { status: 500 });
  }
}