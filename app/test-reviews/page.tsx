"use client";

import ReviewCarousel from "@/components/ReviewCarousel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TestReviewsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-yellow-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              className="text-yellow-700 hover:text-yellow-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-yellow-800">
              Review Carousel Demo
            </h1>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-yellow-800 mb-4">
            Infinite Moving Reviews
          </h2>
          <p className="text-lg text-yellow-600 max-w-2xl mx-auto">
            Experience the smooth infinite scroll of customer reviews from your Sanity CMS.
            Reviews automatically scroll horizontally and pause on hover.
          </p>
        </div>

        {/* Review Carousel */}
        <ReviewCarousel />

        {/* Instructions */}
        <div className="mt-16 bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-yellow-200">
          <h3 className="text-2xl font-bold text-yellow-800 mb-4">
            How to Use
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-yellow-700 mb-2">All Reviews</h4>
              <p className="text-gray-600">
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                  &lt;ReviewCarousel /&gt;
                </code>
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-yellow-700 mb-2">Shop-Specific Reviews</h4>
              <p className="text-gray-600">
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                  &lt;ReviewCarousel shopId="your-shop-id" /&gt;
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 