"use client";

import React from "react";
import ReviewCarousel from "./ReviewCarousel";

export default function ReviewCarouselDemo() {
  return (
    <div className="space-y-12">
      {/* All Reviews Carousel */}
      <div>
        <h2 className="text-2xl font-bold text-center mb-8 text-yellow-800">
          All WeDine Reviews
        </h2>
        <ReviewCarousel />
      </div>

      {/* Shop-Specific Reviews Carousel */}
      <div>
        <h2 className="text-2xl font-bold text-center mb-8 text-yellow-800">
          Reviews for Specific Shop
        </h2>
        <ReviewCarousel shopId="your-shop-id-here" />
      </div>
    </div>
  );
} 