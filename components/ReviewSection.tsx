"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Star, Send, ThumbsUp, User, Calendar, CheckCircle, Loader2, ChevronUp, MessageCircle, Share2, Filter } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

interface Review {
  _id: string;
  userName: string;
  userEmail: string;
  rating: number;
  reviewText: string;
  createdAt: string;
  isVerified: boolean;
  helpfulCount: number;
  shopRef: {
    _id: string;
    shopName: string;
  };
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

interface ReviewSectionProps {
  shopId: string;
  shopName: string;
}

const ReviewSection: React.FC<ReviewSectionProps> = ({ shopId, shopName }) => {
  const { user } = useUser();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'newest' | 'rating' | 'helpful'>('newest');
  const [filterRating, setFilterRating] = useState<number | null>(null);
  
  // Form state
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [userName, setUserName] = useState('');

  // Helpful votes state
  const [helpfulVotes, setHelpfulVotes] = useState<Set<string>>(new Set());
  const [votingReviews, setVotingReviews] = useState<Set<string>>(new Set());

  // Infinite scroll refs
  const observer = useRef<IntersectionObserver | null>(null);

  // Fetch reviews with pagination
  const fetchReviews = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      if (pageNum > 1) setLoadingMore(true);

      const newReviews = await fetch(`/api/reviews?shopId=${shopId}&page=${pageNum}&sort=${sortBy}&filter=${filterRating || 'all'}`).then(res => res.json());
      
      if (newReviews.success) {
        if (append) {
          setReviews(prev => [...prev, ...newReviews.reviews]);
        } else {
          setReviews(newReviews.reviews);
        }
        setStats(newReviews.stats);
        setHasMore(newReviews.reviews.length === 10);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [shopId, sortBy, filterRating]);

  // Initial load
  useEffect(() => {
    fetchReviews(1, false);
  }, [fetchReviews]);

  // Infinite scroll setup
  const lastReviewCallback = useCallback((node: HTMLDivElement) => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        setPage(prev => prev + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore]);

  // Fetch more reviews when page changes (but not on initial load)
  useEffect(() => {
    if (page === 1) return;
    fetchReviews(page, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Reset reviews and page when sort/filter changes
  useEffect(() => {
    setPage(1);
    fetchReviews(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, filterRating, shopId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("=== REVIEW SUBMISSION DEBUG ===");
    console.log("User:", user);
    console.log("Shop ID:", shopId);
    console.log("Shop Name:", shopName);
    console.log("Rating:", rating);
    console.log("Review Text:", reviewText);
    console.log("User Name:", userName);
    
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      alert('Please sign in to submit a review');
      return;
    }

    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    if (reviewText.length < 10) {
      alert('Review must be at least 10 characters long');
      return;
    }

    if (!shopId) {
      alert('Shop ID is missing. Please refresh the page and try again.');
      return;
    }

    try {
      setSubmitting(true);
      
      const requestBody = {
        userName: userName || user.firstName || 'Anonymous',
        userEmail: user.emailAddresses[0].emailAddress,
        shopId,
        rating,
        reviewText,
      };
      
      console.log("Request body being sent:", requestBody);
      
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      const data = await response.json();
      console.log("Response data:", data);
      
      if (data.success) {
        // Reset form
        setRating(0);
        setReviewText('');
        setShowForm(false);
        
        // Refresh reviews
        setPage(1);
        await fetchReviews(1, false);
        
        alert('Review submitted successfully!');
      } else {
        console.error("API returned error:", data);
        let errorMessage = data.error || 'Failed to submit review';
        if (data.details) {
          errorMessage += `\n\nDetails: ${data.details}`;
        }
        if (data.debug) {
          errorMessage += `\n\nDebug Info: ${JSON.stringify(data.debug, null, 2)}`;
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error submitting review:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      alert('Failed to submit review. Please check the console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number, interactive = false, size = 'w-5 h-5') => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? 'button' : undefined}
            onClick={interactive ? () => setRating(star) : undefined}
            onMouseEnter={interactive ? () => setHoveredRating(star) : undefined}
            onMouseLeave={interactive ? () => setHoveredRating(0) : undefined}
            className={`${interactive ? 'cursor-pointer transition-transform hover:scale-110' : ''}`}
            disabled={!interactive}
          >
            <Star
              className={`${size} ${
                star <= (hoveredRating || rating)
                  ? 'fill-yellow-400 text-yellow-400 drop-shadow-sm'
                  : 'text-gray-300'
              } transition-all duration-200`}
            />
          </button>
        ))}
      </div>
    );
  };

  const renderRatingDistribution = () => {
    if (!stats) return null;

    const maxCount = Math.max(...Object.values(stats.ratingDistribution));

    return (
      <div className="space-y-3">
        {[5, 4, 3, 2, 1].map((star) => (
          <div key={star} className="flex items-center gap-3 group cursor-pointer hover:bg-yellow-50 p-2 rounded-lg transition-colors" onClick={() => setFilterRating(filterRating === star ? null : star)}>
            <span className="text-sm text-yellow-700 w-6 font-medium">{star}⭐</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  filterRating === star ? 'bg-yellow-500' : 'bg-yellow-400'
                }`}
                style={{
                  width: `${maxCount > 0 ? (stats.ratingDistribution[star as keyof typeof stats.ratingDistribution] / maxCount) * 100 : 0}%`
                }}
              />
            </div>
            <span className="text-xs text-gray-600 w-8 text-right font-medium">
              {stats.ratingDistribution[star as keyof typeof stats.ratingDistribution]}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHelpfulVote = async (reviewId: string) => {
    if (!user) {
      alert('Please sign in to vote on reviews');
      return;
    }

    if (votingReviews.has(reviewId)) {
      return; // Prevent double voting
    }

    const isVoted = helpfulVotes.has(reviewId);
    const action = isVoted ? 'decrement' : 'increment';

    try {
      setVotingReviews(prev => new Set(prev).add(reviewId));

      const response = await fetch('/api/reviews/helpful', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId,
          action
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setReviews(prev => prev.map(review => 
          review._id === reviewId 
            ? { ...review, helpfulCount: data.helpfulCount }
            : review
        ));

        // Update helpful votes state
        if (isVoted) {
          setHelpfulVotes(prev => {
            const newSet = new Set(prev);
            newSet.delete(reviewId);
            return newSet;
          });
        } else {
          setHelpfulVotes(prev => new Set(prev).add(reviewId));
        }
      } else {
        console.error('Failed to update helpful count:', data.error);
        alert('Failed to update helpful count. Please try again.');
      }
    } catch (error) {
      console.error('Error voting helpful:', error);
      alert('Failed to vote. Please try again.');
    } finally {
      setVotingReviews(prev => {
        const newSet = new Set(prev);
        newSet.delete(reviewId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-yellow-100">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Review Stats Header */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 backdrop-blur-sm rounded-3xl p-8 border border-yellow-200 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-3xl font-bold text-yellow-800 mb-2">Customer Reviews</h3>
            <p className="text-yellow-600">Share your experience with {shopName}</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-bold py-3 px-6 rounded-full hover:from-yellow-500 hover:to-yellow-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <MessageCircle className="w-5 h-5 inline mr-2" />
            Write a Review
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Overall Rating */}
            <div className="text-center bg-white/60 rounded-2xl p-6 border border-yellow-200">
              <div className="text-5xl font-bold text-yellow-800 mb-3">
                {stats.averageRating.toFixed(1)}
              </div>
              <div className="flex justify-center mb-3">
                {renderStars(Math.round(stats.averageRating), false, 'w-6 h-6')}
              </div>
              <div className="text-sm text-yellow-600 font-medium">
                Based on {stats.totalReviews} reviews
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="lg:col-span-2 bg-white/60 rounded-2xl p-6 border border-yellow-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-yellow-800">Rating Breakdown</h4>
                {filterRating && (
                  <button 
                    onClick={() => setFilterRating(null)}
                    className="text-sm text-yellow-600 hover:text-yellow-800"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              {renderRatingDistribution()}
            </div>
          </div>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-yellow-200 shadow-lg animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-2xl font-bold text-yellow-800">Share Your Experience</h4>
            <button 
              onClick={() => setShowForm(false)}
              className="text-yellow-600 hover:text-yellow-800 p-2 rounded-full hover:bg-yellow-100 transition-colors"
            >
              <ChevronUp className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmitReview} className="space-y-6">
            {/* User Name */}
            <div>
              <label className="block text-sm font-semibold text-yellow-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder={user?.firstName || 'Your name'}
                className="w-full px-4 py-3 border border-yellow-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 bg-white/50"
              />
            </div>

            {/* Star Rating */}
            <div>
              <label className="block text-sm font-semibold text-yellow-700 mb-3">
                Your Rating
              </label>
              <div className="flex items-center gap-4">
                {renderStars(rating, true, 'w-8 h-8')}
                <span className="text-lg text-yellow-600 font-medium">
                  {rating > 0 ? `${rating} out of 5 stars` : 'Select rating'}
                </span>
              </div>
            </div>

            {/* Review Text */}
            <div>
              <label className="block text-sm font-semibold text-yellow-700 mb-2">
                Your Review
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience with this shop..."
                rows={5}
                maxLength={500}
                className="w-full px-4 py-3 border border-yellow-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none transition-all duration-200 bg-white/50"
              />
              <div className="text-xs text-gray-500 mt-2 text-right">
                {reviewText.length}/500 characters
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting || rating === 0 || reviewText.length < 10}
                className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-bold py-3 px-8 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-8 py-3 text-yellow-700 border border-yellow-300 rounded-xl hover:bg-yellow-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters and Sort */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-yellow-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-semibold text-yellow-700">Sort by:</span>
          </div>
          {(['newest', 'rating', 'helpful'] as const).map((sort) => (
            <button
              key={sort}
              onClick={() => setSortBy(sort)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                sortBy === sort
                  ? 'bg-yellow-500 text-yellow-900 shadow-lg'
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              }`}
            >
              {sort.charAt(0).toUpperCase() + sort.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-3xl border border-yellow-200">
            <div className="text-6xl mb-4">⭐</div>
            <h3 className="text-2xl font-bold text-yellow-800 mb-2">No Reviews Yet</h3>
            <p className="text-yellow-600 mb-6">Be the first to review {shopName}!</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-bold py-3 px-6 rounded-full hover:from-yellow-500 hover:to-yellow-600 transition-all duration-200 shadow-lg"
            >
              Write First Review
            </button>
          </div>
        ) : (
          reviews.map((review, index) => (
            <div 
              key={review._id} 
              ref={index === reviews.length - 1 ? lastReviewCallback : null}
              className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-yellow-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                    <User className="w-6 h-6 text-yellow-900" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-yellow-800 text-lg">
                        {review.userName}
                      </span>
                      {review.isVerified && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-yellow-600">
                      <Calendar className="w-4 h-4" />
                      {formatDate(review.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {renderStars(review.rating, false, 'w-5 h-5')}
                </div>
              </div>
              
              <p className="text-yellow-700 leading-relaxed mb-4 text-lg">
                {review.reviewText}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-yellow-600">
                  <button 
                    onClick={() => handleHelpfulVote(review._id)}
                    className={`flex items-center gap-1 transition-all duration-200 ${
                      votingReviews.has(review._id)
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:text-yellow-800 hover:scale-105'
                    }`}
                    disabled={votingReviews.has(review._id)}
                  >
                    <ThumbsUp 
                      className={`w-4 h-4 transition-all duration-200 ${
                        helpfulVotes.has(review._id)
                          ? 'fill-yellow-500 text-yellow-500 scale-110'
                          : 'text-gray-400'
                      }`}
                    />
                    <span className={helpfulVotes.has(review._id) ? 'font-semibold' : ''}>
                      Helpful ({review.helpfulCount})
                    </span>
                  </button>
                  <button 
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: `Review by ${review.userName}`,
                          text: review.reviewText,
                          url: window.location.href
                        });
                      } else {
                        // Fallback: copy to clipboard
                        navigator.clipboard.writeText(review.reviewText);
                        alert('Review copied to clipboard!');
                      }
                    }}
                    className="flex items-center gap-1 hover:text-yellow-800 transition-colors group hover:scale-105"
                  >
                    <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Share
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-600 mx-auto mb-2" />
            <p className="text-yellow-600">Loading more reviews...</p>
          </div>
        )}

        {/* End of Reviews */}
        {!hasMore && reviews.length > 0 && (
          <div className="text-center py-8 text-yellow-600">
            <p>You&apos;ve reached the end of all reviews!</p>
          </div>
        )}
      </div>

      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-8 right-8 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110 z-50"
      >
        <ChevronUp className="w-6 h-6" />
      </button>

      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
      `}</style>
    </div>
  );
};

export default ReviewSection; 