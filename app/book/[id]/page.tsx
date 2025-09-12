"use client";
import React, { useEffect, useState } from "react";
import { client } from "@/sanity/lib/client";
import { BookIcon, HomeIcon, ShoppingCartIcon, ArrowLeft, Heart, Share2, Truck, Shield, Award, CheckCircle, InfoIcon, MailIcon, Clock, MapPin, Minus, Plus, History, BookOpen, X } from "lucide-react";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import Image from 'next/image';
import ReviewSection from "@/components/ReviewSection";
import { useCart, CartItem } from "@/components/CartContext";
import { toast } from "sonner";



interface FoodItem {
  _id: string;
  foodName: string;
  shopRef?: {
    _id: string;
    shopName: string;
    latitude?: number;
    longitude?: number;
    ownerMobile?: string;
    ownerEmail?: string;
    paymentMobile?: string;
  };
  imageUrl?: string;
  image?: { asset: { url: string } };
  category?: string;
  price?: number;
  foodType?: string;
  quantity?: number;
  description?: string;
  ingredients?: string[];
  allergens?: string[];
  preparationTime?: number;
  rating?: number;
  reviews?: number;
  spicyLevel?: number;
  isVegetarian?: boolean;
  isVegan?: boolean;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

const FoodDetailPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  
  const [food, setFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [addToCartState, setAddToCartState] = useState<'idle' | 'adding' | 'added'>("idle");
  
  const { cartItems, addToCart } = useCart();
  const cartCount = cartItems.reduce((sum: number, item: CartItem) => sum + (item.quantity || 0), 0);

  useEffect(() => {
    if (!id) return;
    const query = `*[_type == "foodItem" && _id == $id][0]{
      _id,
      foodName,
      shopRef->{
        _id,
        shopName,
        latitude,
        longitude,
        ownerMobile,
        ownerEmail,
        paymentMobile
      },
      imageUrl,
      image{asset->{url}},
      category,
      price,
      foodType,
      quantity,
      description,
      ingredients,
      allergens,
      preparationTime,
      rating,
      reviews,
      spicyLevel,
      isVegetarian,
      isVegan,
      calories,
      protein,
      carbs,
      fat
    }`;
    
    client.fetch(query, { id })
      .then((data) => {
        setFood(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching food item:", error);
        setIsLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= (food?.quantity || 1)) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    if (!user || !food) return;
    
    // Check if item is out of stock
    if (isOutOfStock) {
      toast.error('This item is currently out of stock!');
      return;
    }
    
    setAddToCartState('adding');
    addToCart({
      _id: `${food._id}-${Date.now()}`,
      quantity,
      price: food.price || 0,
      foodId: {
        _id: food._id,
        foodName: food.foodName,
        imageUrl: food.imageUrl,
        image: food.image,
        shopRef: { shopName: food.shopRef?.shopName },
      },
    });
    setAddToCartState('added');
    setTimeout(() => setAddToCartState('idle'), 1200);
  };

  

  const navItems = [
    { name: "Home", link: "/", icon: <HomeIcon /> },
    { name: "Book", link: "/book", icon: <BookOpen /> },
    { name: "History", link: "/orders", icon: <History /> },
    { name: "About", link: "/about", icon: <InfoIcon /> },
    { name: "Contact", link: "/contact", icon: <MailIcon /> },
  ];

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-200 via-yellow-100 to-beige-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-yellow-800 font-semibold">Loading delicious details...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  if (!food) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-200 via-yellow-100 to-beige-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-yellow-800 mb-2">Food Not Found</h1>
          <p className="text-yellow-700 mb-4">This delicious item might have been removed or doesn&apos;t exist.</p>
          <button onClick={() => router.push('/book')} className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-bold py-3 px-6 rounded-full hover:from-yellow-500 hover:to-yellow-600 transition-all duration-200 shadow-lg">
            Browse More Food
          </button>
        </div>
      </div>
    );
  }

  const isOutOfStock = food.quantity === 0;
  const totalPrice = (food.price || 0) * quantity;

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-200 via-yellow-100 to-beige-100">
      <FloatingNav navItems={navItems} showBadges={true} eWalletAmount={500} cartCount={cartCount} />
      
      <div className="pt-24 px-4 sm:px-8">
        <button onClick={() => router.push('/book')} className="flex items-center gap-2 text-yellow-700 hover:text-yellow-900 font-semibold mb-6 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          Back to Menu
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          
          <div className="space-y-6">
            <div className="relative group">
              {/* Main Image Container */}
              <div className="relative overflow-hidden rounded-3xl shadow-2xl border-4 border-white/20">
                <Image
                  src={food.image?.asset?.url || food.imageUrl || "/placeholder.jpg"}
                  alt={food.foodName}
                  width={800}
                  height={500}
                  className={`w-full h-96 lg:h-[500px] object-cover transition-all duration-700 ${isOutOfStock ? 'grayscale brightness-75' : 'group-hover:scale-110'}`}
                />
                
                {/* Premium overlay effects */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-3xl" />
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-transparent to-yellow-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                
                {/* Floating action buttons */}
                <div className="absolute top-6 right-6 flex gap-3">
                  <button 
                    onClick={() => setIsFavorite(!isFavorite)} 
                    className={`p-4 rounded-2xl backdrop-blur-lg transition-all duration-300 shadow-lg border-2 ${isFavorite ? 'bg-red-500 text-white border-red-400 shadow-red-500/30' : 'bg-white/90 text-gray-700 border-white/50 hover:bg-white hover:scale-110'}`}
                  >
                    <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current animate-pulse' : ''}`} />
                  </button>
                  <button className="p-4 rounded-2xl bg-white/90 text-gray-700 hover:bg-white backdrop-blur-lg transition-all duration-300 shadow-lg border-2 border-white/50 hover:scale-110">
                    <Share2 className="w-6 h-6" />
                  </button>
                </div>
                
                {/* Price badge with premium styling */}
                {typeof food.price === "number" && (
                  <div className={`absolute top-6 left-6 px-8 py-4 rounded-2xl shadow-2xl text-2xl border-3 z-10 font-black backdrop-blur-sm ${isOutOfStock ? 'bg-gray-500/90 text-gray-200 border-gray-400' : 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-yellow-900 border-yellow-300 shadow-yellow-500/30'}`}>
                    ₹{food.price}
                  </div>
                )}
                
                {/* Out of stock overlay */}
                {isOutOfStock && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-md rounded-3xl">
                    <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-10 py-6 rounded-3xl font-bold text-2xl shadow-2xl border-3 border-white/80 animate-pulse">
                      🚫 Out of Stock
                    </div>
                  </div>
                )}
                
                {/* Premium corner decoration */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-400/20 to-transparent rounded-bl-3xl"></div>
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-yellow-400/20 to-transparent rounded-tr-3xl"></div>
              </div>
              
              {/* Image quality indicator */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg border border-white/50">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-gray-700">HD Quality</span>
              </div>
            </div>

            {/* Description Section - MOVED TO LEFT COLUMN */}
            {food.description && (
              <div className="bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-lg rounded-3xl p-8 border border-yellow-200/50 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                    <BookIcon className="w-4 h-4 text-yellow-900" />
                  </div>
                  <h3 className="text-2xl font-bold text-yellow-800">About This Dish</h3>
                </div>
                <p className="text-yellow-700 leading-relaxed text-lg">{food.description}</p>
              </div>
            )}

            {/* Nutrition Information - MOVED TO LEFT COLUMN */}
            {(food.calories || food.protein || food.carbs || food.fat) && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 backdrop-blur-lg rounded-3xl p-6 border border-purple-200/50 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full flex items-center justify-center">
                    <Award className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-purple-800">Nutrition Facts</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {food.calories && (
                    <div className="text-center p-4 bg-white/60 rounded-2xl border border-purple-100">
                      <div className="text-2xl font-bold text-purple-800">{food.calories}</div>
                      <div className="text-sm text-purple-600 font-medium">Calories</div>
                    </div>
                  )}
                  {food.protein && (
                    <div className="text-center p-4 bg-white/60 rounded-2xl border border-purple-100">
                      <div className="text-2xl font-bold text-purple-800">{food.protein}g</div>
                      <div className="text-sm text-purple-600 font-medium">Protein</div>
                    </div>
                  )}
                  {food.carbs && (
                    <div className="text-center p-4 bg-white/60 rounded-2xl border border-purple-100">
                      <div className="text-2xl font-bold text-purple-800">{food.carbs}g</div>
                      <div className="text-sm text-purple-600 font-medium">Carbs</div>
                    </div>
                  )}
                  {food.fat && (
                    <div className="text-center p-4 bg-white/60 rounded-2xl border border-purple-100">
                      <div className="text-2xl font-bold text-purple-800">{food.fat}g</div>
                      <div className="text-sm text-purple-600 font-medium">Fat</div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          <div className="space-y-6">
            <div className="space-y-6">
              {/* Title and Shop Section */}
              <div className="bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-lg rounded-3xl p-8 border border-yellow-200/50 shadow-xl">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-5xl lg:text-6xl font-black bg-gradient-to-r from-yellow-700 via-yellow-800 to-yellow-900 bg-clip-text text-transparent mb-4 leading-tight">
                      {food.foodName}
                    </h1>
                    <div className="flex items-center gap-3 text-xl text-yellow-700 font-bold">
                      <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-yellow-900" />
                      </div>
                      <span>{food.shopRef?.shopName || "Unknown Shop"}</span>
                    </div>
                  </div>
                </div>
                
                {/* Rating and Reviews */}
                {(food.rating || food.reviews) && (
                  <div className="flex items-center gap-6 mb-6">
                    {food.rating && (
                      <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-100 to-yellow-200 px-4 py-2 rounded-full border border-yellow-300">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={`text-lg ${i < Math.floor(food.rating || 0) ? 'text-yellow-500' : 'text-gray-300'}`}>⭐</span>
                          ))}
                        </div>
                        <span className="font-bold text-yellow-800">{food.rating}</span>
                      </div>
                    )}
                    {food.reviews && (
                      <div className="flex items-center gap-2 bg-gradient-to-r from-blue-100 to-blue-200 px-4 py-2 rounded-full border border-blue-300">
                        <span className="text-blue-700 font-bold">{food.reviews} reviews</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Premium Tags */}
                <div className="flex flex-wrap gap-3">
                  {food.category && (
                    <span className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 rounded-full text-sm font-bold shadow-lg border border-yellow-300">
                      {food.category}
                    </span>
                  )}
                  {food.isVegetarian && (
                    <span className="px-6 py-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-full text-sm font-bold shadow-lg border border-green-300 flex items-center gap-2">
                      🥬 Vegetarian
                    </span>
                  )}
                  {food.isVegan && (
                    <span className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full text-sm font-bold shadow-lg border border-green-400 flex items-center gap-2">
                      🌱 Vegan
                    </span>
                  )}
                  {food.spicyLevel && food.spicyLevel > 0 && (
                    <span className="px-6 py-3 bg-gradient-to-r from-red-400 to-red-500 text-white rounded-full text-sm font-bold shadow-lg border border-red-300 flex items-center gap-2">
                      {'🌶️'.repeat(food.spicyLevel)} Spicy Level {food.spicyLevel}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Ingredients & Allergens Section */}
            {(food.ingredients && food.ingredients.length > 0) || (food.allergens && food.allergens.length > 0) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {food.ingredients && food.ingredients.length > 0 && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 backdrop-blur-lg rounded-3xl p-6 border border-green-200/50 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-green-800">Ingredients</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {food.ingredients.map((ingredient, index) => (
                        <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium border border-green-200">
                          {ingredient}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {food.allergens && food.allergens.length > 0 && (
                  <div className="bg-gradient-to-br from-red-50 to-orange-50 backdrop-blur-lg rounded-3xl p-6 border border-red-200/50 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-red-400 to-orange-500 rounded-full flex items-center justify-center">
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-red-800">Allergens</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {food.allergens.map((allergen, index) => (
                        <span key={index} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium border border-red-200">
                          {allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Food Type & Preparation Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {food.foodType && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 backdrop-blur-lg rounded-3xl p-6 border border-blue-200/50 shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-blue-800">Food Type</h4>
                  </div>
                  <div className="text-2xl font-bold text-blue-700 capitalize">{food.foodType.replace('_', ' ')}</div>
                </div>
              )}
              
              {food.preparationTime && (
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 backdrop-blur-lg rounded-3xl p-6 border border-orange-200/50 shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-amber-500 rounded-full flex items-center justify-center">
                      <Truck className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-orange-800">Prep Time</h4>
                  </div>
                  <div className="text-2xl font-bold text-orange-700">{food.preparationTime} minutes</div>
                </div>
              )}
            </div>

            {/* Price & Quantity Section */}
            <div className="bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-lg rounded-3xl p-8 border border-yellow-200/50 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-800 bg-clip-text text-transparent">₹{food.price}</div>
                  <div className="text-sm text-yellow-600 font-medium mt-1">{food.quantity} available</div>
                </div>
                {!isOutOfStock && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4 bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-full px-6 py-3 border-2 border-yellow-300">
                      <button onClick={() => handleQuantityChange(-1)} disabled={quantity <= 1} className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white flex items-center justify-center hover:from-yellow-600 hover:to-yellow-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95">
                        <Minus className="w-5 h-5" />
                      </button>
                      <span className="text-2xl font-bold text-yellow-800 min-w-[3rem] text-center">{quantity}</span>
                      <button onClick={() => handleQuantityChange(1)} disabled={quantity >= (food.quantity || 1)} className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white flex items-center justify-center hover:from-yellow-600 hover:to-yellow-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {!isOutOfStock && (
                <div className="text-center p-6 bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-2xl border-2 border-yellow-300">
                  <div className="text-sm text-yellow-600 font-medium mb-1">Total Price</div>
                  <div className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-800 bg-clip-text text-transparent">₹{totalPrice}</div>
                </div>
              )}
            </div>

            {!isOutOfStock ? (
              <div className="space-y-6">
                {/* Primary Add to Cart Button */}
                <button 
                  onClick={handleAddToCart} 
                  aria-label="Add to Cart" 
                  disabled={addToCartState === 'adding' || addToCartState === 'added'} 
                  className={`w-full relative overflow-hidden bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-yellow-900 font-bold py-6 px-8 rounded-3xl shadow-2xl flex items-center justify-center gap-3 transition-all duration-300 hover:shadow-3xl hover:scale-105 active:scale-95 border-2 border-yellow-300 ${addToCartState === 'adding' || addToCartState === 'added' ? 'opacity-70 cursor-not-allowed' : 'hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700'}`}
                >
                  {/* Animated background effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  
                  <div className="relative z-10 flex items-center gap-3">
                    {addToCartState === 'added' ? (
                      <>
                        <CheckCircle className="w-7 h-7 text-green-600 animate-bounce" />
                        <span className="text-green-700 font-bold text-xl">Added to Cart!</span>
                      </>
                    ) : addToCartState === 'adding' ? (
                      <>
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-900"></div>
                        <span className="text-xl">Adding...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCartIcon className="w-7 h-7" />
                        <span className="text-xl">Add to Cart - ₹{totalPrice}</span>
                      </>
                    )}
                  </div>
                </button>

                {/* Secondary Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <button className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-400 to-blue-500 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg hover:from-blue-500 hover:to-blue-600 transition-all duration-200 hover:scale-105 active:scale-95 border border-blue-300">
                    <Heart className="w-5 h-5" />
                    <span>Save</span>
                  </button>
                  <button className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-400 to-purple-500 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg hover:from-purple-500 hover:to-purple-600 transition-all duration-200 hover:scale-105 active:scale-95 border border-purple-300">
                    <Share2 className="w-5 h-5" />
                    <span>Share</span>
                  </button>
                </div>

                {/* Trust Indicators */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200">
                  <div className="flex items-center justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-green-700">
                      <Shield className="w-4 h-4" />
                      <span className="font-medium">Safe Payment</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-700">
                      <Truck className="w-4 h-4" />
                      <span className="font-medium">Fast Delivery</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-700">
                      <Award className="w-4 h-4" />
                      <span className="font-medium">Quality Assured</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl border-2 border-gray-200 shadow-lg">
                <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
                  <X className="w-10 h-10 text-gray-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Out of Stock</h3>
                <p className="text-gray-600 mb-6 text-lg">This delicious item is currently unavailable. Don&apos;t worry, we&apos;re working on getting it back!</p>
                <button 
                  onClick={() => router.push('/book')} 
                  className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-yellow-900 font-bold py-4 px-8 rounded-2xl hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border-2 border-yellow-300"
                >
                  Browse Other Items
                </button>
              </div>
            )}
          </div>
        </div>

        {food.shopRef && (
          <div className="mt-12">
            <ReviewSection shopId={food.shopRef._id || ''} shopName={food.shopRef.shopName || ''} />
          </div>
        )}
      </div>

      
    </div>
  );
};

export default FoodDetailPage;