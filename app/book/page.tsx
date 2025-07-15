"use client";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { client } from "@/sanity/lib/client";
import { BookIcon, HomeIcon, InfoIcon, MailIcon, Filter as FilterIcon, X as CloseIcon, PhoneIcon } from "lucide-react";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import Image from 'next/image';

// FoodItem type for TypeScript
interface FoodItem {
  _id: string;
  foodName: string;
  shopRef?: {
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
}

const CATEGORIES = ["All", "Snacks", "Breakfast", "Lunch"];
const PRICE_RANGES = [
  { label: "₹0-₹50", min: 0, max: 50 },
  { label: "₹50-₹100", min: 50, max: 100 },
  { label: "₹100-₹200", min: 100, max: 200 },
  { label: "₹200-₹250", min: 200, max: 250 },
];
const MOST_ORDERED = ["Tea", "Coffee", "Chicken Fried Rice"];
const FOOD_TYPES = ["Beverages", "Snacks", "Juices", "Breakfast", "Lunch"];

// Haversine formula to calculate distance in km
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

const BookPage = () => {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const pathname = usePathname();
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedPrices, setSelectedPrices] = useState<string[]>([]);
  const [selectedMostOrdered, setSelectedMostOrdered] = useState<string[]>([]);
  const [selectedShops, setSelectedShops] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyMe, setNearbyMe] = useState<boolean>(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedFoodTypes, setSelectedFoodTypes] = useState<string[]>([]);
  const [notificationStatus, setNotificationStatus] = useState<{[key: string]: string}>({});

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    const query = `*[_type == "foodItem"]{
      _id,
      foodName,
      shopRef->{shopName, latitude, longitude, ownerMobile, ownerEmail},
      imageUrl,
      image{asset->{url}},
      category,
      price,
      foodType,
      quantity
    }`;
    const fetchData = async () => {
      const data = await client.fetch(query);
      setFoodItems(data);
    };
    fetchData();
    // Optional: Poll for real-time updates
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Get real-time user location
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Dynamically get unique shop names from data
  const shopNames = useMemo(() => {
    const set = new Set<string>();
    foodItems.forEach(item => { if (item.shopRef?.shopName) set.add(item.shopRef.shopName); });
    return Array.from(set);
  }, [foodItems]);

  const navItems = [
    { name: "Home", link: "/", icon: <HomeIcon /> },
    { name: "Book", link: "/book", icon: <BookIcon /> },
    { name: "About", link: "/about", icon: <InfoIcon /> },
    { name: "Contact", link: "/contact", icon: <MailIcon /> },
  ];

  // Filtering logic
  const filteredItems = useMemo(() => {
    let items = foodItems;
    // Category filter (top buttons)
    if (selectedCategory !== "All") {
      items = items.filter(item => item.category === selectedCategory);
    }
    // Food Type filter (actually filters by category field)
    if (selectedFoodTypes.length > 0) {
      items = items.filter(item => selectedFoodTypes.includes(item.category || ""));
    }
    // Price filter
    if (selectedPrices.length > 0) {
      items = items.filter(item => {
        if (typeof item.price !== "number") return false;
        return selectedPrices.some(rangeLabel => {
          const range = PRICE_RANGES.find(r => r.label === rangeLabel);
          return range && typeof item.price === "number" && item.price >= range.min && item.price < range.max;
        });
      });
    }
    // Most ordered filter
    if (selectedMostOrdered.length > 0) {
      items = items.filter(item => selectedMostOrdered.includes(item.foodName));
    }
    // Shop name filter
    if (selectedShops.length > 0) {
      items = items.filter(item => selectedShops.includes(item.shopRef?.shopName || ""));
    }
    // Nearby Me filter
    if (nearbyMe && userLocation) {
      items = items.filter(item => {
        const lat = item.shopRef?.latitude;
        const lng = item.shopRef?.longitude;
        if (typeof lat !== "number" || typeof lng !== "number") return false;
        const dist = getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, lat, lng);
        return dist <= 0.3; // 0.3 km = 300 meters
      });
    }
    return items;
  }, [foodItems, selectedCategory, selectedPrices, selectedMostOrdered, selectedShops, nearbyMe, userLocation, selectedFoodTypes]);

  // Function to handle stock over notifications
  const handleStockOverNotification = async (item: FoodItem) => {
    const itemId = item._id;
    if (notificationStatus[itemId]) {
      return; // Already sent notification
    }

    try {
      setNotificationStatus(prev => ({ ...prev, [itemId]: "sending" }));
      
      // Get user's email from Clerk
      const userEmail = user?.emailAddresses?.[0]?.emailAddress;
      
      // Log the data being sent
      console.log("=== BOOK PAGE DEBUG ===");
      console.log("Food Item:", item);
      console.log("Shop Ref:", item.shopRef);
      console.log("Owner Mobile from Sanity:", item.shopRef?.ownerMobile);
      
      const requestBody = {
        foodItem: {
          foodName: item.foodName,
          shopRef: {
            shopName: item.shopRef?.shopName || "",
            ownerMobile: item.shopRef?.ownerMobile || "",
            ownerEmail: item.shopRef?.ownerEmail || ""
          }
        },
        userEmail: userEmail
      };
      
      console.log("Request Body being sent:", requestBody);
      
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();
      console.log("API Response:", result);

      if (result.success) {
        setNotificationStatus(prev => ({ ...prev, [itemId]: "sent" }));
      } else {
        setNotificationStatus(prev => ({ ...prev, [itemId]: "failed" }));
      }
    } catch (error) {
      console.error("Notification error:", error);
      setNotificationStatus(prev => ({ ...prev, [itemId]: "failed" }));
    }
  };

  // Handlers for checkboxes
  const handleCheckbox = (value: string, selected: string[], setSelected: (v: string[]) => void) => {
    setSelected(selected.includes(value)
      ? selected.filter(v => v !== value)
      : [...selected, value]);
  };

  // Sidebar filter content (for reuse in desktop and mobile)
  const FilterContent = (
    <div className="bg-white/70 rounded-2xl shadow-xl p-6 border border-yellow-100 w-full">
      <h3 className="text-xl font-bold text-yellow-800 mb-4">Filter</h3>
      {/* Nearby Me */}
      <div className="mb-6">
        <label className="flex items-center gap-2 mb-1 cursor-pointer">
          <input
            type="checkbox"
            checked={nearbyMe}
            onChange={() => setNearbyMe(!nearbyMe)}
            className="accent-yellow-500 w-4 h-4 rounded"
          />
          <span className="text-yellow-900 font-semibold">Nearby Me (within 300m)</span>
        </label>
      </div>
      {/* Category (Food Type) */}
      <div className="mb-6">
        <div className="font-semibold text-yellow-700 mb-2">Category (Food Type)</div>
        {FOOD_TYPES.map(type => (
          <label key={type} className="flex items-center gap-2 mb-1 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedFoodTypes.includes(type)}
              onChange={() => handleCheckbox(type, selectedFoodTypes, setSelectedFoodTypes)}
              className="accent-yellow-500 w-4 h-4 rounded"
            />
            <span className="text-yellow-900">{type}</span>
          </label>
        ))}
      </div>
      {/* Price */}
      <div className="mb-6">
        <div className="font-semibold text-yellow-700 mb-2">Price</div>
        {PRICE_RANGES.map(range => (
          <label key={range.label} className="flex items-center gap-2 mb-1 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedPrices.includes(range.label)}
              onChange={() => handleCheckbox(range.label, selectedPrices, setSelectedPrices)}
              className="accent-yellow-500 w-4 h-4 rounded"
            />
            <span className="text-yellow-900">{range.label}</span>
          </label>
        ))}
      </div>
      {/* Most Ordered */}
      <div className="mb-6">
        <div className="font-semibold text-yellow-700 mb-2">Most Ordered</div>
        {MOST_ORDERED.map(item => (
          <label key={item} className="flex items-center gap-2 mb-1 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedMostOrdered.includes(item)}
              onChange={() => handleCheckbox(item, selectedMostOrdered, setSelectedMostOrdered)}
              className="accent-yellow-500 w-4 h-4 rounded"
            />
            <span className="text-yellow-900">{item}</span>
          </label>
        ))}
      </div>
      {/* Shop Name */}
      <div className="mb-2">
        <div className="font-semibold text-yellow-700 mb-2">Shop Name</div>
        {shopNames.map(shop => (
          <label key={shop} className="flex items-center gap-2 mb-1 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedShops.includes(shop)}
              onChange={() => handleCheckbox(shop, selectedShops, setSelectedShops)}
              className="accent-yellow-500 w-4 h-4 rounded"
            />
            <span className="text-yellow-900">{shop}</span>
          </label>
        ))}
      </div>
    </div>
  );

  // Show loading while checking authentication
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

  // Don't render the page if not signed in
  if (!isSignedIn) {
    return null;
  }

  // Determine if badges should be shown
  const showBadges = isSignedIn && (pathname === "/book" || pathname.startsWith("/book/"));
  const eWalletAmount = 500; // dummy value
  const cartCount = 2; // dummy value for now

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-200 via-yellow-100 to-beige-100 p-2 sm:p-8 flex flex-col md:flex-row">
      <FloatingNav navItems={navItems} showBadges={showBadges} eWalletAmount={eWalletAmount} cartCount={cartCount} />
      {/* Sidebar (desktop) */}
      <aside className="w-72 mr-10 hidden md:block mt-32">
        {FilterContent}
      </aside>
      {/* Mobile filter button and panel */}
      <div className="md:hidden flex justify-end mb-4 mt-24 px-2">
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400 text-yellow-900 font-bold shadow-md border border-yellow-300 hover:bg-yellow-500 transition-all"
          onClick={() => setShowMobileFilters(true)}
        >
          <FilterIcon className="w-5 h-5" />
          Filters
        </button>
      </div>
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center md:hidden">
          <div className="bg-white rounded-2xl shadow-2xl p-4 mt-24 w-[95vw] max-w-md relative animate-fade-in">
            <button
              className="absolute top-2 right-2 text-yellow-700 hover:text-yellow-900"
              onClick={() => setShowMobileFilters(false)}
            >
              <CloseIcon className="w-6 h-6" />
            </button>
            {FilterContent}
          </div>
        </div>
      )}
      {/* Main Content */}
      <div className="flex-1">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-center text-yellow-700 mb-8 sm:mb-12 drop-shadow-2xl tracking-tight  animate-fade-in">Book Your Food</h1>
        {/* Filter Buttons */}
        <div className="flex flex-wrap justify-center mb-8 sm:mb-12 gap-2 sm:gap-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`px-4 sm:px-6 py-2 rounded-full font-bold border-2 shadow-md text-base sm:text-lg transition-all duration-200
                ${selectedCategory === cat
                  ? "bg-gradient-to-r from-yellow-400 to-yellow-300 text-yellow-900 border-yellow-500 scale-110 shadow-lg"
                  : "bg-white/70 text-yellow-700 border-yellow-200 hover:bg-yellow-100 hover:scale-105"}
              `}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-10 md:gap-12 max-w-7xl mx-auto">
          {(filteredItems || []).map((item, index) => {
            let distance = null;
            if (
              typeof item.shopRef?.latitude === "number" &&
              typeof item.shopRef?.longitude === "number" &&
              userLocation
            ) {
              distance = getDistanceFromLatLonInKm(
                userLocation.lat,
                userLocation.lng,
                item.shopRef.latitude,
                item.shopRef.longitude
              );
            }
            
            const isOutOfStock = item.quantity === 0;
            
            return (
              <div key={item._id} className={`relative ${isOutOfStock ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                {/* Stock Over Overlay */}
                {isOutOfStock && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm rounded-3xl p-4">
                    <div className="bg-red-500 text-white px-6 py-3 rounded-full font-bold text-lg shadow-2xl border-2 border-white/80 mb-3">
                      🚫 Stock Over
                    </div>
                    
                                            {/* Contact Information */}
                        {item.shopRef?.ownerMobile && (
                          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 text-center max-w-xs">
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <PhoneIcon className="w-5 h-5 text-green-600" />
                              <span className="font-semibold text-gray-800">Contact Owner</span>
                            </div>
                            <div className="text-sm text-gray-700 mb-2">
                              Call: <span className="font-bold text-green-600">{item.shopRef.ownerMobile}</span>
                            </div>
                            
                            {/* SMS Notification Button */}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleStockOverNotification(item);
                              }}
                              disabled={notificationStatus[item._id] === "sending"}
                              className={`w-full py-2 px-4 rounded-full font-semibold text-sm transition-all duration-200 ${
                                notificationStatus[item._id] === "sent"
                                  ? "bg-green-500 text-white cursor-default"
                                  : notificationStatus[item._id] === "failed"
                                  ? "bg-red-500 text-white hover:bg-red-600"
                                  : notificationStatus[item._id] === "sending"
                                  ? "bg-yellow-500 text-white cursor-wait"
                                  : "bg-blue-500 text-white hover:bg-blue-600"
                              }`}
                            >
                              {notificationStatus[item._id] === "sent" && "✅ SMS Sent"}
                              {notificationStatus[item._id] === "failed" && "❌ Retry SMS"}
                              {notificationStatus[item._id] === "sending" && "⏳ Sending SMS..."}
                              {!notificationStatus[item._id] && "📱 Send SMS Alert"}
                            </button>
                            
                            <div className="text-xs text-gray-500 mt-2">
                              We&apos;ll send an SMS alert to the shop owner
                            </div>
                          </div>
                        )}
                  </div>
                )}
                
                <Link 
                  href={isOutOfStock ? "#" : `/book/${item._id}`}
                  onClick={(e) => isOutOfStock && e.preventDefault()}
                  className={`group rounded-3xl bg-white/60 backdrop-blur-xl shadow-2xl transition-all duration-500 overflow-hidden border border-yellow-100 relative animate-fade-in-up ${
                    isOutOfStock 
                      ? 'opacity-50 hover:scale-100 cursor-not-allowed' 
                      : 'hover:shadow-yellow-200 hover:scale-105 cursor-pointer'
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="relative">
                  <Image
                    src={item.image?.asset?.url || item.imageUrl || "/placeholder.jpg"}
                    alt={item.foodName}
                    width={400}
                    height={256}
                    className={`w-full h-56 sm:h-64 object-cover object-center rounded-t-3xl transition duration-500 ${
                        isOutOfStock 
                          ? 'grayscale brightness-75' 
                          : 'group-hover:brightness-110 group-hover:scale-110'
                      }`}
                  />
                    {/* Shine effect - only for in-stock items */}
                    {!isOutOfStock && (
                      <div className="absolute inset-0 pointer-events-none group-hover:opacity-100 opacity-0 transition-opacity duration-700">
                        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-[200%] bg-gradient-to-br from-white/60 to-transparent rotate-12" />
                      </div>
                    )}
                    
                    {/* Price Badge */}
                    {typeof item.price === "number" && (
                      <div className={`absolute top-4 right-4 px-4 sm:px-6 py-2 rounded-full shadow-xl text-base sm:text-xl border-2 border-white/80 z-10 font-extrabold ${
                        isOutOfStock 
                          ? 'bg-gray-400 text-gray-600' 
                          : 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-yellow-900 animate-bounce'
                      }`}>
                        ₹{item.price}
                      </div>
                    )}
                    
                    {/* Quantity Badge */}
                    {typeof item.quantity === "number" && (
                      <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-full shadow-lg text-sm font-bold border-2 border-white/80 z-10 transition-all duration-300 ${
                        isOutOfStock
                          ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                          : item.quantity > 10 
                          ? 'bg-gradient-to-r from-green-400 to-green-500 text-green-900' 
                          : item.quantity > 5 
                          ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900'
                          : 'bg-gradient-to-r from-red-400 to-red-500 text-red-900 animate-pulse'
                      }`}>
                        {isOutOfStock ? '🔴' : item.quantity > 10 ? '🟢' : item.quantity > 5 ? '🟡' : '🔴'} {isOutOfStock ? '0' : item.quantity} left
                      </div>
                    )}
                    
                    {/* Category Badge */}
                    {item.category && (
                      <div className={`absolute bottom-4 left-4 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                        isOutOfStock 
                          ? 'bg-gray-600/60 text-gray-200 border-gray-400/20' 
                          : 'bg-black/60 text-white border-white/20'
                      }`}>
                        {item.category}
                      </div>
                    )}
                    
                    {/* Hover overlay - only for in-stock items */}
                    {!isOutOfStock && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    )}
                  </div>
                  
                  <div className="p-5 sm:p-7 flex flex-col gap-3 relative">
                    <h2 className={`text-xl sm:text-2xl font-extrabold drop-shadow-sm line-clamp-2 ${
                      isOutOfStock 
                        ? 'text-gray-500' 
                        : 'text-yellow-800 group-hover:text-yellow-600 transition-colors'
                    }`}>
                      {item.foodName}
                    </h2>
                    
                    <div className={`flex items-center gap-2 text-base sm:text-lg font-semibold ${
                      isOutOfStock ? 'text-gray-400' : 'text-yellow-700'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        isOutOfStock ? 'bg-gray-400' : 'bg-yellow-500 animate-pulse'
                      }`}></span>
                      {item.shopRef?.shopName}
                    </div>
                    
                    {distance !== null && (
                      <div className={`flex items-center gap-2 text-xs sm:text-sm font-medium ${
                        isOutOfStock ? 'text-gray-400' : 'text-yellow-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isOutOfStock ? 'bg-gray-400' : 'bg-yellow-400'
                        }`}></span>
                        {distance.toFixed(2)} km away
                      </div>
                    )}
                    
                    {/* Stock indicator bar */}
                    {typeof item.quantity === "number" && (
                      <div className="mt-2">
                        <div className={`flex justify-between text-xs mb-1 ${
                          isOutOfStock ? 'text-gray-400' : 'text-yellow-600'
                        }`}>
                          <span>Stock Level</span>
                          <span>{isOutOfStock ? 'Out of Stock' : `${item.quantity} available`}</span>
                        </div>
                        <div className="w-full bg-yellow-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOutOfStock
                                ? 'bg-gradient-to-r from-red-500 to-red-600'
                                : item.quantity > 10 
                                ? 'bg-gradient-to-r from-green-400 to-green-500' 
                                : item.quantity > 5 
                                ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                                : 'bg-gradient-to-r from-red-400 to-red-500'
                            }`}
                            style={{ width: `${isOutOfStock ? 0 : Math.min((item.quantity / 20) * 100, 100)}%` }}
                          />
                        </div>
                    </div>
                  )}
                    
                    {/* Order now button - only for in-stock items */}
                    {!isOutOfStock && (
                      <div className="mt-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-bold py-2 px-4 rounded-full text-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                          Order Now →
                        </div>
                </div>
                  )}
                </div>
              </Link>
              </div>
            );
          })}
        </div>
        {(filteredItems || []).length === 0 && (
          <div className="text-center text-yellow-600 mt-20 text-xl animate-pulse">No food items available for this category. Please check back soon!</div>
        )}
        <style jsx global>{`
          .animate-fade-in {
            animation: fadeIn 1.2s cubic-bezier(0.4,0,0.2,1) both;
          }
          @keyframes fadeIn {
            0% { opacity: 0; transform: translateY(40px); }
            100% { opacity: 1; transform: none; }
          }
          .animate-fade-in-up {
            animation: fadeInUp 0.8s cubic-bezier(0.4,0,0.2,1) both;
          }
          @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(60px) scale(0.95); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default BookPage;


