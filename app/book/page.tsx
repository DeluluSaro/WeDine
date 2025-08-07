"use client";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { client } from "@/sanity/lib/client";
import { BookIcon, Filter as FilterIcon, X as CloseIcon, PhoneIcon } from "lucide-react";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Image from 'next/image';

// COLOR PALETTE
const COLORS = {
  yellow: "#FFD600",
  yellowDeep: "#FFB300",
  yellowLight: "#FFF9E5",
  beige: "#E5DAC0",
  offWhite: "#FAF8F3",
  shadow: "#786600",
  brown: "#997E2C"
};

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
const MOST_ORDERED = ["Tea", "Coffee", "Chicken-Fried-Rice"];
const FOOD_TYPES = ["Beverages", "Snacks", "Juices", "Breakfast", "Lunch"];

// Haversine formula for distance
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const BookPage = () => {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
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
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const shopNames = useMemo(() => {
    const set = new Set<string>();
    foodItems.forEach(item => { if (item.shopRef?.shopName) set.add(item.shopRef.shopName); });
    return Array.from(set);
  }, [foodItems]);

  const filteredItems = useMemo(() => {
    let items = foodItems;
    if (selectedCategory !== "All") items = items.filter(item => item.category === selectedCategory);
    if (selectedFoodTypes.length > 0) items = items.filter(item => selectedFoodTypes.includes(item.category || ""));
    if (selectedPrices.length > 0) {
      items = items.filter(item => {
        if (typeof item.price !== "number") return false;
        return selectedPrices.some(rangeLabel => {
          const range = PRICE_RANGES.find(r => r.label === rangeLabel);
          return range && typeof item.price === "number" && item.price >= range.min && item.price < range.max;
        });
      });
    }
    if (selectedMostOrdered.length > 0) items = items.filter(item => selectedMostOrdered.includes(item.foodName));
    if (selectedShops.length > 0) items = items.filter(item => selectedShops.includes(item.shopRef?.shopName || ""));
    if (nearbyMe && userLocation) {
      items = items.filter(item => {
        const lat = item.shopRef?.latitude;
        const lng = item.shopRef?.longitude;
        if (typeof lat !== "number" || typeof lng !== "number") return false;
        const dist = getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, lat, lng);
        return dist <= 0.3;
      });
    }
    return items;
  }, [foodItems, selectedCategory, selectedPrices, selectedMostOrdered, selectedShops, nearbyMe, userLocation, selectedFoodTypes]);

  const handleStockOverNotification = async (item: FoodItem) => {
    const itemId = item._id;
    if (notificationStatus[itemId]) return;
    try {
      setNotificationStatus(prev => ({ ...prev, [itemId]: "sending" }));
      const userEmail = user?.emailAddresses?.[0]?.emailAddress;
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
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(requestBody)
      });
      const result = await response.json();
      if (result.success) setNotificationStatus(prev => ({ ...prev, [itemId]: "sent" }));
      else setNotificationStatus(prev => ({ ...prev, [itemId]: "failed" }));
    } catch (error) {
      setNotificationStatus(prev => ({ ...prev, [itemId]: "failed" }));
    }
  };

  const handleCheckbox = (value: string, selected: string[], setSelected: (v: string[]) => void) => {
    setSelected(selected.includes(value)
      ? selected.filter(v => v !== value)
      : [...selected, value]);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: COLORS.yellowLight}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-24 w-24 border-[6px] border-b-yellow-500 border-t-white mx-auto border-solid" style={{borderColor: `${COLORS.yellow} ${COLORS.yellow} ${COLORS.beige} ${COLORS.yellow}`}}></div>
          <p className="mt-4 text-xl font-bold text-yellow-900 tracking-wide">Loading...</p>
        </div>
      </div>
    );
  }
  if (!isSignedIn) return null;

  return (
    <div className="min-h-screen" style={{background: `radial-gradient(ellipse at 65% 4%, ${COLORS.offWhite} 0%, ${COLORS.yellowLight} 70%, ${COLORS.beige} 100%)`}}>
      <FloatingNav navItems={[{ name:"Book", link:"/book", icon:<BookIcon /> }]} showBadges />
      
      {/* Mobile filter button */}
      <div className="lg:hidden fixed top-20 left-3 z-40">
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="bg-white border border-yellow-200 rounded-full p-3 shadow-lg flex items-center justify-center active:scale-95"
        >
          <FilterIcon className="w-5 h-5 text-yellow-800" />
        </button>
      </div>
      {showMobileFilters && (
      <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setShowMobileFilters(false)}>
        <div className="absolute right-0 top-0 h-full w-80 max-w-[96vw] bg-white shadow-2xl rounded-l-2xl p-7 overflow-y-auto"
          style={{boxShadow: `-6px 0 24px 0 ${COLORS.brown}10`}}
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-yellow-900">Filters</h3>
            <button onClick={() => setShowMobileFilters(false)}>
              <CloseIcon className="w-6 h-6 text-yellow-700" />
            </button>
          </div>
          <FiltersPanel
            CATEGORIES={CATEGORIES}
            PRICE_RANGES={PRICE_RANGES}
            MOST_ORDERED={MOST_ORDERED}
            FOOD_TYPES={FOOD_TYPES}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedPrices={selectedPrices}
            setSelectedPrices={setSelectedPrices}
            selectedMostOrdered={selectedMostOrdered}
            setSelectedMostOrdered={setSelectedMostOrdered}
            selectedFoodTypes={selectedFoodTypes}
            setSelectedFoodTypes={setSelectedFoodTypes}
            nearbyMe={nearbyMe}
            setNearbyMe={setNearbyMe}
            shopNames={shopNames}
            selectedShops={selectedShops}
            setSelectedShops={setSelectedShops}
          />
        </div>
      </div>)}

      <div className="pt-20 sm:pt-24 lg:pt-32 px-4 sm:px-6 lg:px-12">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-7 flex flex-col gap-2">
          <div className="flex gap-3 items-center">
            <BookIcon className="w-8 h-8 text-yellow-500 drop-shadow" />
            <h1 className="text-3xl md:text-4xl font-extrabold text-shadow" style={{color:COLORS.yellowDeep, textShadow:'0 1px 4px #FFE380'}}>Book Your Food</h1>
          </div>
          <div className="text-brown-800 text-lg max-w-2xl font-medium" style={{color:COLORS.brown, opacity:0.92}}>
            Discover delicious meals from campus restaurants. Prebook online and enjoy hassle-free pickup with RFID verification.
          </div>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
          {/* Desktop Filters */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="bg-white/90 shadow-2xl rounded-3xl p-8 sticky top-32 border border-yellow-100"
              style={{boxShadow: `0 8px 40px 0 ${COLORS.shadow}14`}}>
              <h3 className="text-xl font-bold text-yellow-900 mb-7 tracking-wide">Filters</h3>
              <FiltersPanel
                CATEGORIES={CATEGORIES}
                PRICE_RANGES={PRICE_RANGES}
                MOST_ORDERED={MOST_ORDERED}
                FOOD_TYPES={FOOD_TYPES}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedPrices={selectedPrices}
                setSelectedPrices={setSelectedPrices}
                selectedMostOrdered={selectedMostOrdered}
                setSelectedMostOrdered={setSelectedMostOrdered}
                selectedFoodTypes={selectedFoodTypes}
                setSelectedFoodTypes={setSelectedFoodTypes}
                nearbyMe={nearbyMe}
                setNearbyMe={setNearbyMe}
                shopNames={shopNames}
                selectedShops={selectedShops}
                setSelectedShops={setSelectedShops}
              />
            </div>
          </aside>
          
          {/* Main grid */}
          <main className="flex-1">
            <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(filteredItems||[]).map((item, idx) => {
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
                  <div
                    key={item._id}
                    className="relative animate-fade-in-up"
                    style={{
                      animationDelay: `${idx * 70}ms`,
                    }}
                  >
                    {/* Stock Over Overlay */}
                    {isOutOfStock && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 rounded-3xl p-4" style={{backdropFilter:"blur(3px)"}}>
                        <div className="bg-gradient-to-r from-yellow-300 to-yellow-500 text-brown-900 shadow-md px-7 py-3 rounded-full font-extrabold text-lg border-2 border-yellow-200 mb-4">🚫 Stock Over</div>
                        {item.shopRef?.ownerMobile && (
                          <div className="bg-white/95 rounded-2xl p-5 pb-4 border border-yellow-100 text-center max-w-xs">
                            <div className="flex items-center justify-center gap-3 mb-2 font-bold text-yellow-900 tracking-wide">
                              <PhoneIcon className="w-5 h-5 text-yellow-600" /> Contact Owner
                            </div>
                            <div className="text-sm text-yellow-900 mb-2">
                              Call: <span className="font-bold text-yellow-900">{item.shopRef.ownerMobile}</span>
                            </div>
                            <button
                              onClick={(e) => {e.preventDefault(); e.stopPropagation(); handleStockOverNotification(item);}}
                              disabled={notificationStatus[item._id]==="sending"}
                              className={`w-full py-2 px-4 mt-2 rounded-full font-semibold text-sm transition-all duration-200
                                ${notificationStatus[item._id]==="sent"
                                  ? "bg-green-500 text-white cursor-default"
                                  : notificationStatus[item._id]==="failed"
                                  ? "bg-red-500 text-white hover:bg-red-600"
                                  : notificationStatus[item._id]==="sending"
                                  ? "bg-yellow-400 text-yellow-900 cursor-wait"
                                  : "bg-yellow-600 text-white hover:bg-yellow-700"
                                }`}
                              style={{boxShadow: "0 2px 6px 0 #FFD60044"}}
                            >
                              {notificationStatus[item._id]==="sent" && "✅ SMS Sent"}
                              {notificationStatus[item._id]==="failed" && "❌ Retry SMS"}
                              {notificationStatus[item._id]==="sending" && "⏳ Sending SMS..."}
                              {!notificationStatus[item._id] && "📱 Send SMS Alert"}
                            </button>
                            <div className="text-xs text-yellow-700 mt-2 opacity-80">
                              We&apos;ll send an SMS alert to the shop owner
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <Link
                      href={isOutOfStock ? "#" : `/book/${item._id}`}
                      onClick={e => isOutOfStock && e.preventDefault()}
                      className="group block rounded-3xl bg-white/90 transition-all duration-300 overflow-hidden border-2 border-yellow-100 shadow-xl hover:shadow-2xl hover:-translate-y-1 hover:border-yellow-200"
                      style={{
                        boxShadow: isOutOfStock
                          ? `0 4px 12px 0 rgba(0,0,0,0.1)`
                          : `0 8px 25px 0 ${COLORS.shadow}20, 0 4px 20px 0 ${COLORS.yellow}20`,
                      }}
                    >
                      {/* IMAGE SECTION - Fixed height for consistency */}
                      <div className="relative w-full h-48 sm:h-52 overflow-hidden">
                        <Image
                          src={item.image?.asset?.url || item.imageUrl || "/placeholder.jpg"}
                          alt={item.foodName}
                          fill
                          sizes="(min-width: 1024px) 300px, (min-width: 640px) 340px, 85vw"
                          className={`object-cover w-full h-full transition-all duration-300 ${
                            isOutOfStock 
                              ? 'grayscale brightness-75' 
                              : 'group-hover:brightness-105 group-hover:scale-105'
                          }`}
                        />
                        
                        {/* Top badges - Price and Quantity */}
                        <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
                          {/* Quantity badge */}
                          {typeof item.quantity === "number" && (
                            <div className="px-3 py-1.5 rounded-full shadow-lg text-sm font-bold border-2 border-white/90"
                              style={{
                                background: isOutOfStock
                                  ? `linear-gradient(90deg,#ffd6d2, #fccfcf)`
                                  : item.quantity > 10 
                                    ? `linear-gradient(90deg,#fffcc2, #ccffaf)`
                                    : item.quantity > 5 
                                      ? `linear-gradient(90deg,#fff6d0, #ffe07f)`
                                      : `linear-gradient(90deg,#fff0e3, #ffc2c2)`,
                                color: isOutOfStock
                                  ? "#C23016" : item.quantity > 10
                                  ? "#448229"
                                  : item.quantity > 5
                                  ? "#B27600"
                                  : "#D10022"
                              }}>
                              {isOutOfStock ? '🔴' : item.quantity > 10 ? '🟢' : item.quantity > 5 ? '🟡' : '🔴'} {isOutOfStock ? '0' : item.quantity} left
                            </div>
                          )}
                          
                          {/* Price badge */}
                          {typeof item.price === "number" && (
                            <div className="px-4 py-2 rounded-full font-black border-2 border-white/90 shadow-lg text-base"
                              style={{
                                background: isOutOfStock
                                  ? "#FAF8F399"
                                  : `linear-gradient(135deg,${COLORS.yellowLight}, ${COLORS.yellow})`,
                                color: isOutOfStock ? "#C0B58A" : COLORS.brown
                              }}>
                              ₹{item.price}
                            </div>
                          )}
                        </div>

                        {/* Bottom badges - Category and Distance */}
                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end z-10">
                          {/* Category badge */}
                          {item.category && (
                            <div className="px-3 py-1.5 rounded-full text-sm font-semibold border border-yellow-200/60 backdrop-blur-sm"
                              style={{
                                background: isOutOfStock
                                  ? "rgba(221, 216, 211, 0.8)"
                                  : "rgba(253, 232, 186, 0.9)",
                                color: isOutOfStock ? "#666" : "#B27600"
                              }}>
                              {item.category}
                            </div>
                          )}
                          
                          {/* Distance badge */}
                          {distance !== null && (
                            <div className="flex gap-2 items-center px-3 py-1.5 rounded-full border border-yellow-200/60 text-xs font-semibold text-yellow-800 backdrop-blur-sm"
                              style={{background: "rgba(255, 249, 229, 0.9)"}}>
                              <span className={`w-2 h-2 rounded-full ${isOutOfStock ? 'bg-yellow-300' : 'bg-yellow-500'}`}></span>
                              {distance.toFixed(2)} km away
                            </div>
                          )}
                        </div>

                        {/* Hover shimmer effect */}
                        {!isOutOfStock && (
                          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <div className="absolute left-[-40%] top-0 w-2/3 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent rotate-12 blur-sm translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-out"/>
                          </div>
                        )}
                      </div>

                      {/* TEXT SECTION - Proper spacing and visibility */}
                      <div className="p-5 bg-white/95 backdrop-blur-sm">
                        {/* Food name */}
                        <h2 className={`font-bold text-lg leading-tight mb-3 line-clamp-2 min-h-[48px] transition-colors duration-200
                          ${isOutOfStock ? 'text-gray-500' : 'text-yellow-900 group-hover:text-yellow-700'}`}>
                          {item.foodName}
                        </h2>
                        
                        {/* Shop name */}
                        <div className="flex items-center gap-2 text-base font-semibold mb-3" style={{color: isOutOfStock ? "#999" : COLORS.brown}}>
                          <span className={`w-2 h-2 rounded-full ${isOutOfStock?'bg-gray-300':'bg-yellow-400 animate-pulse'}`}></span>
                          <span className="truncate">{item.shopRef?.shopName}</span>
                        </div>

                        {/* Stock level bar */}
                        {typeof item.quantity === "number" && (
                          <div className="mb-4">
                            <div className={`flex justify-between text-xs mb-2 ${isOutOfStock? 'text-gray-400':'text-yellow-800'}`}>
                              <span>Stock Level</span>
                              <span>{isOutOfStock ? 'Out of Stock' : `${item.quantity} available`}</span>
                            </div>
                            <div className="w-full bg-yellow-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{
                                  width: `${isOutOfStock ? 0 : Math.min(item.quantity / 20 * 100, 100)}%`,
                                  background: isOutOfStock
                                    ? "#FFD6D6"
                                    : item.quantity > 10
                                    ? "linear-gradient(90deg,#B2FF95,#7FFF7F)"
                                    : item.quantity > 5
                                    ? "linear-gradient(90deg,#FFE37B,#FFC107)"
                                    : "linear-gradient(90deg,#FF6F6F,#FF3030)"
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Order button - Only show on hover for available items */}
                        {!isOutOfStock && (
                          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-bold py-3 px-4 rounded-full text-center shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer">
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
            {(filteredItems||[]).length === 0 && (
              <div className="text-center text-yellow-800/80 font-semibold mt-24 text-xl animate-pulse">
                No food items available for this category. Please check back soon!
              </div>
            )}
          </main>
        </div>

        {/* Global Styles */}
        <style jsx global>{`
          .animate-fade-in-up {
            animation: fadeInUp 0.6s cubic-bezier(0.4,0,0.2,1) both;
          }
          @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(30px) scale(0.96); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          .line-clamp-2 { 
            display: -webkit-box; 
            -webkit-line-clamp: 2; 
            -webkit-box-orient: vertical; 
            overflow: hidden;
            word-break: break-word;
          }
          /* Improved hover effects */
          .group:hover .group-hover\\:scale-105 {
            transform: scale(1.05);
          }
          .group:hover .group-hover\\:brightness-105 {
            filter: brightness(1.05);
          }
        `}</style>
      </div>
    </div>
  );
};

// FILTER PANEL
const FiltersPanel = ({
  CATEGORIES, PRICE_RANGES, MOST_ORDERED, FOOD_TYPES,
  selectedCategory, setSelectedCategory,
  selectedPrices, setSelectedPrices,
  selectedMostOrdered, setSelectedMostOrdered,
  selectedFoodTypes, setSelectedFoodTypes,
  nearbyMe, setNearbyMe,
  shopNames, selectedShops, setSelectedShops
}: any) => {
  return (
    <div className="flex flex-col gap-6">
      {/* Categories */}
      <section>
        <h4 className="uppercase font-semibold text-yellow-800 mb-2 tracking-wider">Categories</h4>
        <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(category => (
          <label key={category} className="inline-flex items-center rounded-2xl px-3 py-1 font-medium cursor-pointer text-yellow-950 border border-yellow-100 bg-yellow-50 hover:bg-yellow-100">
            <input type="radio" name="category" value={category} checked={selectedCategory === category} onChange={e => setSelectedCategory(e.target.value)} className="mr-1 accent-yellow-500" />
            {category}
          </label>
        ))}
        </div>
      </section>
      {/* Price Ranges */}
      <section>
        <h4 className="uppercase font-semibold text-yellow-800 mb-2 tracking-wider">Price Range</h4>
        <div className="flex flex-wrap gap-2">
        {PRICE_RANGES.map(range => (
          <label key={range.label} className="inline-flex items-center rounded-2xl px-3 py-1 font-medium cursor-pointer text-yellow-950 border border-yellow-100 bg-beige-100 hover:bg-yellow-100">
            <input type="checkbox" checked={selectedPrices.includes(range.label)} onChange={() => handleCheckbox(range.label, selectedPrices, setSelectedPrices)} className="mr-1 accent-yellow-500" />
            {range.label}
          </label>
        ))}
        </div>
      </section>
      {/* Most Ordered */}
      <section>
        <h4 className="uppercase font-semibold text-yellow-800 mb-2 tracking-wider">Most Ordered</h4>
        <div className="flex flex-wrap gap-2">
        {MOST_ORDERED.map(item => (
          <label key={item} className="inline-flex items-center rounded-2xl px-3 py-1 font-medium cursor-pointer text-yellow-950 border border-yellow-100 bg-yellow-50 hover:bg-yellow-100">
            <input type="checkbox" checked={selectedMostOrdered.includes(item)} onChange={() => handleCheckbox(item, selectedMostOrdered, setSelectedMostOrdered)} className="mr-1 accent-yellow-500" />
            {item}
          </label>
        ))}
        </div>
      </section>
      {/* Food Types */}
      <section>
        <h4 className="uppercase font-semibold text-yellow-800 mb-2 tracking-wider">Food Types</h4>
        <div className="flex flex-wrap gap-2">
        {FOOD_TYPES.map(type => (
          <label key={type} className="inline-flex items-center rounded-2xl px-3 py-1 font-medium cursor-pointer text-yellow-950 border border-yellow-100 bg-beige-100 hover:bg-yellow-100">
            <input type="checkbox" checked={selectedFoodTypes.includes(type)} onChange={() => handleCheckbox(type, selectedFoodTypes, setSelectedFoodTypes)} className="mr-1 accent-yellow-500" />
            {type}
          </label>
        ))}
        </div>
      </section>
      {/* Shop Names */}
      {shopNames && shopNames.length > 1 && (
        <section>
          <h4 className="uppercase font-semibold text-yellow-800 mb-2 tracking-wider">Shops</h4>
          <div className="flex flex-wrap gap-2">
          {shopNames.map((shop:string) => (
            <label key={shop} className="inline-flex items-center rounded-2xl px-3 py-1 font-medium cursor-pointer text-yellow-950 border border-yellow-100 bg-yellow-50 hover:bg-yellow-100">
              <input type="checkbox" checked={selectedShops.includes(shop)} onChange={() => handleCheckbox(shop, selectedShops, setSelectedShops)} className="mr-1 accent-yellow-500" />
              {shop}
            </label>
          ))}
          </div>
        </section>
      )}
      {/* Nearby Me */}
      <section>
        <label className="inline-flex items-center gap-2 font-semibold px-3 py-2 bg-yellow-50 border border-yellow-100 rounded-2xl cursor-pointer shadow-sm hover:bg-yellow-100">
          <input type="checkbox" checked={nearbyMe} onChange={e => setNearbyMe(e.target.checked)} className="accent-yellow-400" />
          Nearby Me <span className="text-xs text-yellow-700 ml-2">(<span className="font-bold">~300m</span> radius)</span>
        </label>
      </section>
    </div>
  );
};

function handleCheckbox(value:string, selected:string[], setSelected:any) {
  setSelected(selected.includes(value)
    ? selected.filter(v => v !== value)
    : [...selected, value]);
}

export default BookPage;