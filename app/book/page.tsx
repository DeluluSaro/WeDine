"use client";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { client } from "@/sanity/lib/client";
import { BookIcon, Filter as FilterIcon, X as CloseIcon, PhoneIcon, HomeIcon, ShoppingCartIcon, History, BookOpen } from "lucide-react";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Image from 'next/image';
import { useCart } from "@/components/CartContext";

// COLOR PALETTE
const COLORS = {
  yellow: "#FFD600",
  yellowDeep: "#FFB300",
  yellowLight: "#FFF9E5",
  beige: "#E5DAC0",
  offWhite: "#FAF8F3",
  shadow: "#786600",
  brown: "#997E2C",
  brownDark: "#6D581C",
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
  const { cartItems } = useCart();
  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

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
    return Array.from(set).sort();
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
    if (notificationStatus[itemId] === 'sending' || notificationStatus[itemId] === 'sent') return;
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

  const navItems = [
    { name: "Home", link: "/", icon: <HomeIcon /> },
    { name: "Book", link: "/book", icon: <BookOpen /> },
    { name: "History", link: "/orders", icon: <History /> },
    { name: "Cart", link: "/cart", icon: <ShoppingCartIcon /> },
  ];

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: COLORS.yellowLight}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-24 w-24 border-[6px] border-solid mx-auto" style={{borderColor: `${COLORS.yellowDeep} ${COLORS.yellowDeep} ${COLORS.beige} ${COLORS.yellowDeep}`}}></div>
          <p className="mt-4 text-xl font-bold tracking-wide" style={{color: COLORS.brownDark}}>Loading...</p>
        </div>
      </div>
    );
  }
  if (!isSignedIn) return null;

  return (
    <div className="min-h-screen" style={{background: `linear-gradient(180deg, ${COLORS.yellowLight}, ${COLORS.offWhite} 80%)`}}>
      <FloatingNav navItems={navItems} showBadges={true} cartCount={cartCount} eWalletAmount={500} />
      
      <div className="lg:hidden fixed top-20 left-4 z-40">
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="bg-white/80 backdrop-blur-sm border border-yellow-200/80 rounded-full p-3 shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <FilterIcon className="w-5 h-5" style={{color: COLORS.brownDark}} />
        </button>
      </div>
      
      {showMobileFilters && (
      <div className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)}>
        <div className="absolute right-0 top-0 h-full w-80 max-w-[90vw] bg-white shadow-2xl rounded-l-2xl p-6 overflow-y-auto"
          style={{boxShadow: `-6px 0 24px 0 ${COLORS.shadow}10`}}
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold" style={{color: COLORS.brownDark}}>Filters</h3>
            <button onClick={() => setShowMobileFilters(false)} className="p-1 rounded-full hover:bg-yellow-100">
              <CloseIcon className="w-6 h-6" style={{color: COLORS.brown}} />
            </button>
          </div>
          <FiltersPanel
            {...{CATEGORIES, PRICE_RANGES, MOST_ORDERED, FOOD_TYPES, selectedCategory, setSelectedCategory, selectedPrices, setSelectedPrices, selectedMostOrdered, setSelectedMostOrdered, selectedFoodTypes, setSelectedFoodTypes, nearbyMe, setNearbyMe, shopNames, selectedShops, setSelectedShops, handleCheckbox}}
          />
        </div>
      </div>)}

      <div className="pt-24 sm:pt-28 lg:pt-32 px-4 sm:px-6 lg:px-8">
        <header className="max-w-7xl mx-auto mb-10 flex flex-col gap-3 text-center">
          <div className="flex gap-3 items-center justify-center">
            <BookIcon className="w-10 h-10 text-yellow-500 drop-shadow-md" />
            <h1 className="text-4xl md:text-5xl font-extrabold" style={{color: COLORS.brownDark, textShadow: '0 2px 10px rgba(255, 214, 0, 0.5)'}}>Book Your Food</h1>
          </div>
          <p className="text-lg max-w-3xl mx-auto font-medium" style={{color: COLORS.brown}}>
            Discover delicious meals from campus restaurants. Prebook online and enjoy hassle-free pickup with RFID verification.
          </p>
        </header>

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-10">
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-3xl p-7 sticky top-28 border border-yellow-200/50"
              style={{boxShadow: `0 8px 40px 0 ${COLORS.shadow}10`}}>
              <h3 className="text-2xl font-bold mb-7 tracking-wide" style={{color: COLORS.brownDark}}>Filters</h3>
              <FiltersPanel
                {...{CATEGORIES, PRICE_RANGES, MOST_ORDERED, FOOD_TYPES, selectedCategory, setSelectedCategory, selectedPrices, setSelectedPrices, selectedMostOrdered, setSelectedMostOrdered, selectedFoodTypes, setSelectedFoodTypes, nearbyMe, setNearbyMe, shopNames, selectedShops, setSelectedShops, handleCheckbox}}
              />
            </div>
          </aside>
          
          <main className="flex-1">
            <div className="grid gap-x-6 gap-y-8 sm:gap-x-8 sm:gap-y-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {(filteredItems||[]).map((item, idx) => {
                let distance = null;
                if (item.shopRef?.latitude && item.shopRef?.longitude && userLocation) {
                  distance = getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, item.shopRef.latitude, item.shopRef.longitude);
                }
                const isOutOfStock = item.quantity === 0;
                return (
                  <div
                    key={item._id}
                    className="relative animate-fade-in-up"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    {isOutOfStock && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 rounded-3xl p-4" style={{backdropFilter:"blur(4px)"}}>
                        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg px-6 py-2.5 rounded-full font-bold text-base border-2 border-red-300/50 mb-4">🚫 Out of Stock</div>
                        {item.shopRef?.ownerMobile && (
                          <div className="bg-white/95 rounded-2xl p-5 pb-4 border border-yellow-100 text-center max-w-xs shadow-lg">
                            <div className="flex items-center justify-center gap-3 mb-2 font-bold tracking-wide" style={{color: COLORS.brownDark}}>
                              <PhoneIcon className="w-5 h-5 text-yellow-600" /> Contact Owner
                            </div>
                            <div className="text-sm mb-3" style={{color: COLORS.brown}}>
                              Call: <span className="font-bold" style={{color: COLORS.brownDark}}>{item.shopRef.ownerMobile}</span>
                            </div>
                            <button
                              onClick={(e) => {e.preventDefault(); e.stopPropagation(); handleStockOverNotification(item);}}
                              disabled={notificationStatus[item._id]==="sending" || notificationStatus[item._id]==="sent"}
                              className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed
                                ${notificationStatus[item._id]==="sent"
                                  ? "bg-green-500 text-white"
                                  : notificationStatus[item._id]==="failed"
                                  ? "bg-red-500 text-white hover:bg-red-600"
                                  : notificationStatus[item._id]==="sending"
                                  ? "bg-yellow-400 text-yellow-900"
                                  : "bg-yellow-500 text-white hover:bg-yellow-600"
                                }`}
                              style={{boxShadow: "0 2px 8px -1px #FFD60066"}}
                            >
                              {notificationStatus[item._id]==="sent" ? "✅ SMS Sent" : notificationStatus[item._id]==="failed" ? "❌ Retry SMS" : notificationStatus[item._id]==="sending" ? "⏳ Sending..." : "📱 Notify Owner"}
                            </button>
                            <div className="text-xs opacity-80 mt-2" style={{color: COLORS.brown}}>
                              We&apos;ll send an SMS alert to the shop owner.
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <Link
                      href={isOutOfStock ? "#" : `/book/${item._id}`}
                      onClick={e => isOutOfStock && e.preventDefault()}
                      className="group block rounded-3xl bg-white/90 transition-all duration-300 overflow-hidden border border-yellow-200/50 hover:-translate-y-1.5"
                      style={{
                        boxShadow: isOutOfStock ? '0 4px 12px rgba(0,0,0,0.08)' : '0 8px 25px rgba(120,102,0,0.15)',
                        transition: 'all 0.3s ease-out',
                      }}
                    >
                      <div className="relative w-full h-48 sm:h-56 overflow-hidden">
                        <Image
                          src={item.image?.asset?.url || item.imageUrl || "/placeholder.jpg"}
                          alt={item.foodName}
                          fill
                          sizes="(min-width: 1280px) 350px, (min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
                          className={`object-cover w-full h-full transition-all duration-500 ease-in-out ${
                            isOutOfStock 
                              ? 'grayscale brightness-75' 
                              : 'group-hover:brightness-105 group-hover:scale-110'
                          }`}
                        />
                        
                        <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
                          {typeof item.quantity === "number" && (
                            <div className="px-3 py-1 text-xs font-bold text-white rounded-full shadow-sm border border-white/50"
                              style={{
                                background: isOutOfStock ? 'linear-gradient(to right, #F87171, #EF4444)' : item.quantity > 10 ? 'linear-gradient(to right, #34D399, #10B981)' : item.quantity > 5 ? 'linear-gradient(to right, #FBBF24, #F59E0B)' : 'linear-gradient(to right, #F87171, #EF4444)'
                              }}>
                              {isOutOfStock ? '0' : item.quantity} left
                            </div>
                          )}
                          
                          {typeof item.price === "number" && (
                            <div className="px-4 py-1.5 rounded-full font-extrabold border-2 border-white/80 shadow-lg text-base"
                              style={{
                                background: `linear-gradient(135deg, ${COLORS.yellow}, ${COLORS.yellowDeep})`,
                                color: COLORS.brownDark
                              }}>
                              ₹{item.price}
                            </div>
                          )}
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end z-10">
                          {item.category && (
                            <div className="px-3 py-1 rounded-full text-xs font-semibold border border-white/30 text-white"
                              style={{ background: "rgba(0, 0, 0, 0.2)", backdropFilter: "blur(5px)" }}>
                              {item.category}
                            </div>
                          )}
                          
                          {distance !== null && (
                            <div className="flex gap-2 items-center px-3 py-1 rounded-full border border-white/30 text-xs font-semibold text-white"
                              style={{ background: "rgba(0, 0, 0, 0.2)", backdropFilter: "blur(5px)" }}>
                              <span className={`w-2 h-2 rounded-full ${isOutOfStock ? 'bg-yellow-300' : 'bg-yellow-400'}`}></span>
                              {distance.toFixed(1)} km away
                            </div>
                          )}
                        </div>

                        {!isOutOfStock && (
                          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                            style={{background: 'radial-gradient(circle, transparent 50%, rgba(255,255,255,0.1) 100%)'}}/>
                        )}
                      </div>

                      <div className="p-5 bg-white">
                        <h2 className={`font-extrabold text-lg leading-tight mb-2 line-clamp-2 min-h-[56px] transition-colors duration-200
                          ${isOutOfStock ? 'text-gray-500' : 'group-hover:text-yellow-700'}`} style={{color: isOutOfStock ? '' : COLORS.brownDark}}>
                          {item.foodName}
                        </h2>
                        
                        <div className="flex items-center gap-2.5 text-sm font-semibold mb-4" style={{color: isOutOfStock ? "#999" : COLORS.brown}}>
                          <span className={`w-2 h-2 rounded-full ${isOutOfStock?'bg-gray-300':'bg-yellow-400'}`}></span>
                          <span className="truncate">{item.shopRef?.shopName}</span>
                        </div>

                        {typeof item.quantity === "number" && (
                          <div className="mb-4">
                            <div className={`flex justify-between text-xs mb-1.5 ${isOutOfStock? 'text-gray-400':'text-yellow-800'}`}>
                              <span className="font-semibold">Stock Level</span>
                              <span className="font-medium">{isOutOfStock ? 'Out of Stock' : `${item.quantity} available`}</span>
                            </div>
                            <div className="w-full bg-yellow-100 rounded-full h-2.5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{
                                  width: `${isOutOfStock ? 0 : Math.min(item.quantity / 20 * 100, 100)}%`,
                                  background: isOutOfStock ? "#ddd" : item.quantity > 10 ? "linear-gradient(90deg, #A7F3D0, #34D399)" : item.quantity > 5 ? "linear-gradient(90deg, #FDE68A, #FBBF24)" : "linear-gradient(90deg, #FECACA, #F87171)"
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {!isOutOfStock && (
                          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 pt-1">
                            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-bold py-3 px-4 rounded-lg text-center shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all duration-200 cursor-pointer">
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
              <div className="text-center font-semibold mt-24 text-xl animate-pulse" style={{color: COLORS.brown}}>
                No food items found. Try adjusting your filters!
              </div>
            )}
          </main>
        </div>

        <style jsx global>{`
          .animate-fade-in-up {
            animation: fadeInUp 0.6s cubic-bezier(0.4,0,0.2,1) both;
          }
          @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(20px) scale(0.98); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          .line-clamp-2 { 
            display: -webkit-box; 
            -webkit-line-clamp: 2; 
            -webkit-box-orient: vertical; 
            overflow: hidden;
            word-break: break-word;
          }
        `}</style>
      </div>
    </div>
  );
}

const FiltersPanel = ({
  CATEGORIES, PRICE_RANGES, MOST_ORDERED, FOOD_TYPES,
  selectedCategory, setSelectedCategory,
  selectedPrices, setSelectedPrices,
  selectedMostOrdered, setSelectedMostOrdered,
  selectedFoodTypes, setSelectedFoodTypes,
  nearbyMe, setNearbyMe,
  shopNames, selectedShops, setSelectedShops,
  handleCheckbox
}: any) => {
  const FilterSection = ({ title, children }: {title: string, children: React.ReactNode}) => (
    <section className="py-4 border-b border-yellow-100 last:border-b-0">
      <h4 className="uppercase font-bold text-sm mb-3 tracking-wider" style={{color: COLORS.brown}}>{title}</h4>
      <div className="flex flex-wrap gap-2">
        {children}
      </div>
    </section>
  );

  return (
    <div className="flex flex-col -my-4">
      <FilterSection title="Categories">
        {CATEGORIES.map(category => (
          <div key={category}>
            <input type="radio" name="category" id={`cat-${category}`} value={category} checked={selectedCategory === category} onChange={e => setSelectedCategory(e.target.value)} className="hidden peer" />
            <label htmlFor={`cat-${category}`} className="block cursor-pointer rounded-full px-4 py-2 text-sm font-semibold border transition-all duration-200 peer-checked:bg-gradient-to-r peer-checked:from-yellow-400 peer-checked:to-yellow-500 peer-checked:text-white peer-checked:border-yellow-500 peer-checked:shadow-md bg-white hover:bg-yellow-50 border-gray-200">
              {category}
            </label>
          </div>
        ))}
      </FilterSection>
      
      <FilterSection title="Price Range">
        {PRICE_RANGES.map(range => (
          <div key={range.label}>
            <input type="checkbox" id={`price-${range.label}`} checked={selectedPrices.includes(range.label)} onChange={() => handleCheckbox(range.label, selectedPrices, setSelectedPrices)} className="hidden peer" />
            <label htmlFor={`price-${range.label}`} className="block cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium border transition-all duration-200 peer-checked:bg-yellow-200 peer-checked:text-yellow-900 peer-checked:border-yellow-300 bg-white hover:bg-yellow-50 border-gray-200">
              {range.label}
            </label>
          </div>
        ))}
      </FilterSection>

      <FilterSection title="Most Ordered">
        {MOST_ORDERED.map(item => (
          <div key={item}>
            <input type="checkbox" id={`most-${item}`} checked={selectedMostOrdered.includes(item)} onChange={() => handleCheckbox(item, selectedMostOrdered, setSelectedMostOrdered)} className="hidden peer" />
            <label htmlFor={`most-${item}`} className="block cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium border transition-all duration-200 peer-checked:bg-yellow-200 peer-checked:text-yellow-900 peer-checked:border-yellow-300 bg-white hover:bg-yellow-50 border-gray-200">
              {item}
            </label>
          </div>
        ))}
      </FilterSection>

      <FilterSection title="Food Types">
        {FOOD_TYPES.map(type => (
          <div key={type}>
            <input type="checkbox" id={`type-${type}`} checked={selectedFoodTypes.includes(type)} onChange={() => handleCheckbox(type, selectedFoodTypes, setSelectedFoodTypes)} className="hidden peer" />
            <label htmlFor={`type-${type}`} className="block cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium border transition-all duration-200 peer-checked:bg-yellow-200 peer-checked:text-yellow-900 peer-checked:border-yellow-300 bg-white hover:bg-yellow-50 border-gray-200">
              {type}
            </label>
          </div>
        ))}
      </FilterSection>

      {shopNames && shopNames.length > 1 && (
        <FilterSection title="Shops">
          {shopNames.map((shop:string) => (
            <div key={shop}>
              <input type="checkbox" id={`shop-${shop}`} checked={selectedShops.includes(shop)} onChange={() => handleCheckbox(shop, selectedShops, setSelectedShops)} className="hidden peer" />
              <label htmlFor={`shop-${shop}`} className="block cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium border transition-all duration-200 peer-checked:bg-yellow-200 peer-checked:text-yellow-900 peer-checked:border-yellow-300 bg-white hover:bg-yellow-50 border-gray-200">
                {shop}
              </label>
            </div>
          ))}
        </FilterSection>
      )}

      <section className="pt-5">
        <label className="inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={nearbyMe} onChange={e => setNearbyMe(e.target.checked)} className="sr-only peer" />
          <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
          <span className="ms-3 text-sm font-semibold" style={{color: COLORS.brownDark}}>Nearby Me <span className="text-xs font-normal opacity-80">(~300m)</span></span>
        </label>
      </section>
    </div>
  );
}

export default BookPage;