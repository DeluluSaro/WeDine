"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Star, User } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ReviewCarouselProps {
  shopId?: string; // Optional: if provided, shows only reviews for that shop
}

export default function ReviewCarousel({ shopId }: ReviewCarouselProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const url = shopId 
        ? `/api/reviews?shopId=${shopId}&page=1&sort=rating&filter=all`
        : '/api/reviews?page=1&sort=rating&filter=all';
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setReviews(data.reviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Transform reviews to the format expected by InfiniteMovingCards
  const transformedReviews = reviews.map((review) => ({
    quote: review.reviewText,
    name: review.userName,
    title: review.shopRef?.shopName || 'WeDine Restaurant',
    rating: review.rating,
    date: review.createdAt,
    helpfulCount: review.helpfulCount,
    isVerified: review.isVerified,
  }));

  if (loading) {
    return (
      <div className="h-[20rem] rounded-md flex flex-col antialiased bg-gradient-to-r from-yellow-50 to-orange-50 items-center justify-center relative overflow-hidden">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-500 mx-auto"></div>
        <p className="mt-4 text-yellow-800 font-medium">Loading reviews...</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="h-[20rem] rounded-md flex flex-col antialiased bg-gradient-to-r from-yellow-50 to-orange-50 items-center justify-center relative overflow-hidden">
        <div className="text-center">
          <div className="text-4xl mb-4">⭐</div>
          <h3 className="text-xl font-bold text-yellow-800 mb-2">No Reviews Yet</h3>
          <p className="text-yellow-600">Be the first to share your experience!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[20rem] rounded-md flex flex-col antialiased bg-gradient-to-r from-yellow-50 to-orange-50 items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-100/30 to-orange-100/30" />
      <div className="relative z-10 w-full h-full flex items-center">
        <ReviewInfiniteMovingCards
          items={transformedReviews}
          direction="right"
          speed="slow"
          className="w-full"
        />
      </div>
    </div>
  );
}

// Custom InfiniteMovingCards component with enhanced styling for reviews
export const ReviewInfiniteMovingCards = ({
  items,
  direction = "left",
  speed = "fast",
  pauseOnHover = true,
  className,
}: {
  items: {
    quote: string;
    name: string;
    title: string;
    rating: number;
    date: string;
    helpfulCount: number;
    isVerified: boolean;
  }[];
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  pauseOnHover?: boolean;
  className?: string;
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollerRef = React.useRef<HTMLUListElement>(null);
  const [start, setStart] = useState(false);
  
  const getDirection = useCallback(() => {
    if (containerRef.current) {
      if (direction === "left") {
        containerRef.current.style.setProperty(
          "--animation-direction",
          "forwards",
        );
      } else {
        containerRef.current.style.setProperty(
          "--animation-direction",
          "reverse",
        );
      }
    }
  }, [direction]);
  
  const getSpeed = useCallback(() => {
    if (containerRef.current) {
      if (speed === "fast") {
        containerRef.current.style.setProperty("--animation-duration", "20s");
      } else if (speed === "normal") {
        containerRef.current.style.setProperty("--animation-duration", "40s");
      } else {
        containerRef.current.style.setProperty("--animation-duration", "80s");
      }
    }
  }, [speed]);
  
  const addAnimation = useCallback(() => {
    if (containerRef.current && scrollerRef.current) {
      const scrollerContent = Array.from(scrollerRef.current.children);

      scrollerContent.forEach((item) => {
        const duplicatedItem = item.cloneNode(true);
        if (scrollerRef.current) {
          scrollerRef.current.appendChild(duplicatedItem);
        }
      });

      getDirection();
      getSpeed();
      setStart(true);
    }
  }, [getDirection, getSpeed]);

  useEffect(() => {
    addAnimation();
  }, [addAnimation]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "scroller relative z-20 max-w-7xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]",
        className,
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          "flex w-max min-w-full shrink-0 flex-nowrap gap-6 py-4",
          start && "animate-scroll",
          pauseOnHover && "hover:[animation-play-state:paused]",
        )}
      >
        {items.map((item, idx) => (
          <li
            className="relative w-[320px] max-w-full shrink-0 rounded-2xl border border-yellow-200 bg-white/80 backdrop-blur-sm px-6 py-5 md:w-[380px] shadow-lg hover:shadow-xl transition-all duration-300"
            key={`${item.name}-${idx}`}
          >
            <blockquote>
              <div className="mb-3">
                {renderStars(item.rating)}
              </div>
              <span className="relative z-20 text-sm leading-[1.6] font-normal text-gray-700 line-clamp-4">
                &ldquo;{item.quote}&rdquo;
              </span>
              <div className="relative z-20 mt-4 flex flex-row items-center justify-between">
                <span className="flex flex-col gap-1">
                  <span className="text-sm leading-[1.6] font-semibold text-yellow-800">
                    {item.name}
                  </span>
                  <span className="text-xs leading-[1.6] font-normal text-gray-500">
                    {item.title} • {formatDate(item.date)}
                  </span>
                </span>
                <div className="flex items-center">
                  <User className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </blockquote>
          </li>
        ))}
      </ul>
    </div>
  );
}; 