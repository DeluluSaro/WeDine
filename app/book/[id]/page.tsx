"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { 
  BookIcon, 
  HomeIcon, 
  InfoIcon, 
  MailIcon, 
  Plus, 
  Minus, 
  ShoppingCart, 
  
  Clock, 
  MapPin, 
  Phone, 
  Mail,
  ArrowLeft,
  Heart,
  Share2,
  Truck,
  Shield,
  Award,
  CheckCircle
} from "lucide-react";
import ReviewSection from "@/components/ReviewSection";
import { useAuth, useUser } from "@clerk/nextjs";
import { useCart, CartItem } from "@/components/CartContext";
import Image from 'next/image';

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
  const pathname = usePathname();
  
  const [food, setFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showNutrition, setShowNutrition] = useState(false);
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
        ownerEmail
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

  // Redirect to sign-in if not authenticated
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

  const handleBuyNow = () => {
    // TODO: Implement direct purchase
    console.log(`Buying ${quantity} ${food?.foodName} now`);
    // Navigate to checkout
  };

  const handleReviewCart = () => {
    router.push('/cart');
  };

  const navItems = [
    { name: "Home", link: "/", icon: <HomeIcon /> },
    { name: "Book", link: "/book", icon: <BookIcon /> },
    { name: "About", link: "/about", icon: <InfoIcon /> },
    { name: "Contact", link: "/contact", icon: <MailIcon /> },
  ];

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-200 via-yellow-100 to-beige-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-yellow-800 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  // Determine if badges should be shown
  const showBadges = isSignedIn && (pathname === "/book" || pathname.startsWith("/book/"));
  const eWalletAmount = 500; // dummy value

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-200 via-yellow-100 to-beige-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-yellow-800 font-semibold">Loading delicious details...</p>
        </div>
      </div>
    );
  }

  if (!food) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-200 via-yellow-100 to-beige-100">
        <div className="text-center">
          <div className="text-6xl mb-4">🍽️</div>
          <h1 className="text-2xl font-bold text-yellow-800 mb-2">Food Not Found</h1>
          <p className="text-yellow-700 mb-4">This delicious item might have been removed or doesn&apos;t exist.</p>
          <button 
            onClick={() => router.push('/book')}
            className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-bold py-3 px-6 rounded-full hover:from-yellow-500 hover:to-yellow-600 transition-all duration-200 shadow-lg"
          >
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
        <FloatingNav navItems={navItems} showBadges={showBadges} eWalletAmount={eWalletAmount} cartCount={cartCount} />
      
      {/* Back Button */}
      <div className="pt-24 px-4 sm:px-8">
        <button 
          onClick={() => router.push('/book')}
          className="flex items-center gap-2 text-yellow-700 hover:text-yellow-900 font-semibold mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Menu
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          
          {/* Left Column - Image and Basic Info */}
          <div className="space-y-6">
            {/* Main Image */}
            <div className="relative group">
      <Image
        src={food.image?.asset?.url || food.imageUrl || "/placeholder.jpg"}
        alt={food.foodName}
        width={800}
        height={500}
        className={`w-full h-96 lg:h-[500px] object-cover rounded-3xl shadow-2xl transition-all duration-500 ${
          isOutOfStock ? 'grayscale brightness-75' : 'group-hover:scale-105'
        }`}
      />
              
              {/* Image Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
              
              {/* Action Buttons */}
              <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`p-3 rounded-full backdrop-blur-sm transition-all duration-200 ${
                    isFavorite 
                      ? 'bg-red-500 text-white shadow-lg' 
                      : 'bg-white/80 text-gray-700 hover:bg-white'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
                <button className="p-3 rounded-full bg-white/80 text-gray-700 hover:bg-white backdrop-blur-sm transition-all duration-200">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>

              {/* Stock Status */}
              {isOutOfStock && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-3xl">
                  <div className="bg-red-500 text-white px-8 py-4 rounded-full font-bold text-xl shadow-2xl border-2 border-white/80">
                    🚫 Out of Stock
                  </div>
                </div>
              )}

              {/* Price Badge */}
              {typeof food.price === "number" && (
                <div className={`absolute top-4 left-4 px-6 py-3 rounded-full shadow-xl text-xl border-2 border-white/80 z-10 font-extrabold ${
                  isOutOfStock 
                    ? 'bg-gray-400 text-gray-600' 
                    : 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-yellow-900'
                }`}>
                  ₹{food.price}
                </div>
              )}
            </div>

            {/* Quick Info Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 text-center border border-yellow-100">
                <div className="text-2xl mb-1">⭐</div>
                <div className="text-sm font-semibold text-yellow-800">
                  {food.rating || 4.5}
                </div>
                <div className="text-xs text-yellow-600">
                  {food.reviews || 128} reviews
                </div>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 text-center border border-yellow-100">
                <Clock className="w-6 h-6 mx-auto mb-1 text-yellow-600" />
                <div className="text-sm font-semibold text-yellow-800">
                  {food.preparationTime || 15} min
                </div>
                <div className="text-xs text-yellow-600">Prep time</div>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 text-center border border-yellow-100">
                <Truck className="w-6 h-6 mx-auto mb-1 text-yellow-600" />
                <div className="text-sm font-semibold text-yellow-800">Free</div>
                <div className="text-xs text-yellow-600">Delivery</div>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 text-center border border-yellow-100">
                <Shield className="w-6 h-6 mx-auto mb-1 text-yellow-600" />
                <div className="text-sm font-semibold text-yellow-800">Safe</div>
                <div className="text-xs text-yellow-600">Hygiene</div>
              </div>
            </div>
          </div>

          {/* Right Column - Details and Actions */}
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-4xl lg:text-5xl font-extrabold text-yellow-800 mb-2 leading-tight">
                    {food.foodName}
                  </h1>
                  <div className="flex items-center gap-4 text-lg text-yellow-700 font-semibold">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-5 h-5" />
                      {food.shopRef?.shopName || "Unknown Shop"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {food.category && (
                  <span className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                    {food.category}
                  </span>
                )}
                {food.isVegetarian && (
                  <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                    🥬 Vegetarian
                  </span>
                )}
                {food.isVegan && (
                  <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                    🌱 Vegan
                  </span>
                )}
                {food.spicyLevel && food.spicyLevel > 0 && (
                  <span className="px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                    {'🌶️'.repeat(food.spicyLevel)} Spicy
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {food.description && (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-yellow-100">
                <h3 className="text-xl font-bold text-yellow-800 mb-3">Description</h3>
                <p className="text-yellow-700 leading-relaxed">{food.description}</p>
              </div>
            )}

            {/* Ingredients */}
            {food.ingredients && food.ingredients.length > 0 && (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-yellow-100">
                <h3 className="text-xl font-bold text-yellow-800 mb-3">Ingredients</h3>
                <div className="flex flex-wrap gap-2">
                  {food.ingredients.map((ingredient, index) => (
                    <span key={index} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                      {ingredient}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Allergens */}
            {food.allergens && food.allergens.length > 0 && (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-yellow-100">
                <h3 className="text-xl font-bold text-yellow-800 mb-3">⚠️ Allergens</h3>
                <div className="flex flex-wrap gap-2">
                  {food.allergens.map((allergen, index) => (
                    <span key={index} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                      {allergen}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Nutrition Info */}
            {(food.calories || food.protein || food.carbs || food.fat) && (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-yellow-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-yellow-800">Nutrition Info</h3>
                  <button 
                    onClick={() => setShowNutrition(!showNutrition)}
                    className="text-yellow-600 hover:text-yellow-800 font-semibold"
                  >
                    {showNutrition ? 'Hide' : 'Show'} Details
                  </button>
                </div>
                
                {showNutrition && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {food.calories && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-800">{food.calories}</div>
                        <div className="text-sm text-yellow-600">Calories</div>
                      </div>
                    )}
                    {food.protein && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-800">{food.protein}g</div>
                        <div className="text-sm text-yellow-600">Protein</div>
                      </div>
                    )}
                    {food.carbs && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-800">{food.carbs}g</div>
                        <div className="text-sm text-yellow-600">Carbs</div>
                      </div>
                    )}
                    {food.fat && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-800">{food.fat}g</div>
                        <div className="text-sm text-yellow-600">Fat</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Quantity and Price */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-yellow-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-2xl font-bold text-yellow-800">₹{food.price}</div>
                  <div className="text-sm text-yellow-600">
                    {food.quantity} available

                  </div>
                  
                </div>
                
                {!isOutOfStock && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-yellow-100 rounded-full px-4 py-2">
                      <button
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= 1}
                        className="w-8 h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-lg font-bold text-yellow-800 min-w-[2rem] text-center">
                        {quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(1)}
                        disabled={quantity >= (food.quantity || 1)}
                        className="w-8 h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {!isOutOfStock && (
                <div className="text-right mb-4">
                  <div className="text-sm text-yellow-600">Total Price</div>
                  <div className="text-3xl font-bold text-yellow-800">₹{totalPrice}</div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {!isOutOfStock ? (
              <div className="space-y-4">
                <button
                  onClick={handleAddToCart}
                  aria-label="Add to Cart"
                  disabled={addToCartState === 'adding' || addToCartState === 'added'}
                  className={`w-full relative bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-bold py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all duration-200
                    hover:from-yellow-500 hover:to-yellow-600 hover:scale-105 active:scale-95
                    ${addToCartState === 'adding' || addToCartState === 'added' ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {addToCartState === 'added' ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-green-600 animate-bounce" />
                      <span className="text-green-700 font-bold">Added!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-6 h-6" />
                      Add to Cart - ₹{totalPrice}
                    </>
                  )}
                </button>
                <button
                  onClick={handleReviewCart}
                  className="w-full bg-gradient-to-r from-blue-400 to-blue-500 text-white font-bold py-4 px-6 rounded-2xl hover:from-blue-500 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Review Cart
                </button>
                <button
                  onClick={handleBuyNow}
                  className="w-full bg-gradient-to-r from-green-400 to-green-500 text-white font-bold py-4 px-6 rounded-2xl hover:from-green-500 hover:to-green-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Buy Now - ₹{totalPrice}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">😔</div>
                <h3 className="text-xl font-bold text-yellow-800 mb-2">Out of Stock</h3>
                <p className="text-yellow-700 mb-4">This item is currently unavailable. Check back later!</p>
                <button 
                  onClick={() => router.push('/book')}
                  className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-bold py-3 px-6 rounded-full hover:from-yellow-500 hover:to-yellow-600 transition-all duration-200 shadow-lg"
                >
                  Browse Other Items
                </button>
              </div>
            )}

            {/* Shop Contact */}
            {food.shopRef && (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-yellow-100">
                <h3 className="text-xl font-bold text-yellow-800 mb-4">Shop Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-yellow-600" />
                    <span className="text-yellow-700 font-semibold">{food.shopRef.shopName}</span>
                  </div>
                  {food.shopRef.ownerMobile && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-yellow-600" />
                      <span className="text-yellow-700">{food.shopRef.ownerMobile}</span>
                    </div>
                  )}
                  {food.shopRef.ownerEmail && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-yellow-600" />
                      <span className="text-yellow-700">{food.shopRef.ownerEmail}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        {food.shopRef && (
          <div className="mt-12">
            <ReviewSection 
              shopId={food.shopRef._id || ''} 
              shopName={food.shopRef.shopName || ''} 
            />
            {/* Debug info */}
            <div className="text-xs text-gray-500 mt-2">
              Debug: Shop ID = {food.shopRef._id || 'NOT FOUND'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodDetailPage;
