"use client";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { client } from "@/sanity/lib/client";
import { BookIcon, HomeIcon, InfoIcon, MailIcon, Filter as FilterIcon, X as CloseIcon } from "lucide-react";
import { FloatingNav } from "@/components/ui/floating-navbar";

// FoodItem type for TypeScript
interface FoodItem {
  _id: string;
  foodName: string;
  shopName: string;
  location?: string;
  imageUrl?: string;
  image?: { asset: { url: string } };
  category?: string;
  price?: number;
  latitude?: number;
  longitude?: number;
}

const CATEGORIES = ["All", "Snacks", "Breakfast", "Lunch"];
const PRICE_RANGES = [
  { label: "₹0-₹50", min: 0, max: 50 },
  { label: "₹50-₹100", min: 50, max: 100 },
  { label: "₹100-₹200", min: 100, max: 200 },
  { label: "₹200-₹250", min: 200, max: 250 },
];
const MOST_ORDERED = ["Tea", "Coffee", "Chicken Fried Rice"];

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
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedPrices, setSelectedPrices] = useState<string[]>([]);
  const [selectedMostOrdered, setSelectedMostOrdered] = useState<string[]>([]);
  const [selectedShops, setSelectedShops] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyMe, setNearbyMe] = useState<boolean>(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const query = `*[_type == "foodItem"]{
      _id,
      foodName,
      shopName,
      location,
      imageUrl,
      image{asset->{url}},
      category,
      price,
      latitude,
      longitude
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
    foodItems.forEach(item => { if (item.shopName) set.add(item.shopName); });
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
      items = items.filter(item => selectedShops.includes(item.shopName));
    }
    // Nearby Me filter
    if (nearbyMe && userLocation) {
      items = items.filter(item => {
        if (typeof item.latitude !== "number" || typeof item.longitude !== "number") return false;
        const dist = getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, item.latitude, item.longitude);
        return dist <= 0.3; // 0.3 km = 300 meters
      });
    }
    return items;
  }, [foodItems, selectedCategory, selectedPrices, selectedMostOrdered, selectedShops, nearbyMe, userLocation]);

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
            onChange={() => setNearbyMe(v => !v)}
            className="accent-yellow-500 w-4 h-4 rounded"
          />
          <span className="text-yellow-900 font-semibold">Nearby Me (within 300m)</span>
        </label>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-200 via-yellow-100 to-beige-100 p-2 sm:p-8 flex flex-col md:flex-row">
      <FloatingNav navItems={navItems} />
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
        <h1 className="text-4xl sm:text-5xl font-extrabold text-center text-yellow-700 mb-8 sm:mb-12 drop-shadow-2xl tracking-tight mt-24 animate-fade-in">Book Your Food</h1>
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
          {filteredItems.map((item) => {
            let distance = null;
            if (
              typeof item.latitude === "number" &&
              typeof item.longitude === "number" &&
              userLocation
            ) {
              distance = getDistanceFromLatLonInKm(
                userLocation.lat,
                userLocation.lng,
                item.latitude,
                item.longitude
              );
            }
            return (
              <Link key={item._id} href={`/book/${item._id}`}
                className="group rounded-3xl bg-white/60 backdrop-blur-xl shadow-2xl hover:shadow-yellow-200 transition-all duration-300 cursor-pointer overflow-hidden border border-yellow-100 hover:scale-105 relative">
                <div className="relative">
                  <img
                    src={item.image?.asset?.url || item.imageUrl || "/placeholder.jpg"}
                    alt={item.foodName}
                    className="w-full h-56 sm:h-64 object-cover object-center rounded-t-3xl group-hover:brightness-110 transition duration-300 group-hover:scale-105"
                  />
                  {/* Shine effect */}
                  <div className="absolute inset-0 pointer-events-none group-hover:opacity-100 opacity-0 transition-opacity duration-500">
                    <div className="absolute -top-1/4 -left-1/4 w-1/2 h-[200%] bg-gradient-to-br from-white/60 to-transparent rotate-12 blur-2xl animate-shine" />
                  </div>
                  {typeof item.price === "number" && (
                    <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-yellow-900 font-extrabold px-4 sm:px-6 py-2 rounded-full shadow-xl text-base sm:text-xl border-2 border-white/80 z-10 animate-bounce">
                      ₹{item.price}
                    </div>
                  )}
                </div>
                <div className="p-5 sm:p-7 flex flex-col gap-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-yellow-800 group-hover:text-yellow-600 transition-colors drop-shadow-sm">{item.foodName}</h2>
                  <div className="text-yellow-700 text-base sm:text-lg font-semibold">{item.shopName}</div>
                  {item.location && <div className="text-yellow-500 text-sm font-medium">{item.location}</div>}
                  {distance !== null && (
                    <div className="text-yellow-600 text-xs sm:text-sm font-medium">{distance.toFixed(2)} km away</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
        {filteredItems.length === 0 && (
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
          .animate-shine {
            animation: shine 1.5s linear infinite;
          }
          @keyframes shine {
            0% { transform: translateX(-100%) rotate(12deg); }
            100% { transform: translateX(200%) rotate(12deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default BookPage;
