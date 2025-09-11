"use client";
import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { ShoppingCart, Home, Book, Trash2, Plus, Minus, ArrowLeft, History, BookOpen } from "lucide-react";
import { useCart } from '../../components/CartContext';
import BuyNowPopup from '@/components/BuyNowPopup';
import Image from 'next/image';
import Link from 'next/link';

interface OrderItem {
  foodName: string;
  quantity: number;
}

interface Order {
  _id: string;
  orderId?: number;
  createdAt?: string;
  status?: string;
  foodName?: string;
  shopName?: string;
  quantityOrdered?: number;
  total?: number;
  items?: OrderItem[];
}

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

// CartPage component
const CartPage = () => {
  const { user } = useUser();
  const { cartItems, decrement, deleteItem, updateQuantity } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [showBuyNowPopup, setShowBuyNowPopup] = useState(false);

  const navItems = [
    { name: "Home", link: "/", icon: <Home /> },
    { name: "Book", link: "/book", icon: <BookOpen /> },
    { name: "History", link: "/orders", icon: <History /> },
    { name: "Cart", link: "/cart", icon: <ShoppingCart /> },
  ];

  const fetchOrders = async () => {
    if (!user) return;
    setOrdersLoading(true);
    try {
      const res = await fetch(`/api/orders?userId=${user.id}&type=active`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      setOrdersError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);

  const handleCheckout = () => {
    if (!user || cartItems.length === 0) return;
    setShowBuyNowPopup(true);
  };

  const handleOrderPlaced = () => {
    // This function is now just a callback to refresh the orders list.
    // The popup handles cart clearing and success messages.
    fetchOrders();
  };

  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">{status}</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">{status}</span>;
      case 'cancelled':
        return <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">{status}</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 rounded-full">{status}</span>;
    }
  }

  return (
    <div className="min-h-screen pb-20" style={{background: `linear-gradient(180deg, ${COLORS.yellowLight}, ${COLORS.offWhite} 80%)`}}>
      <FloatingNav navItems={navItems} showBadges={true} cartCount={totalItems} eWalletAmount={500} />
      <div className="max-w-6xl mx-auto pt-24 sm:pt-32 px-4">
        <header className="flex items-center gap-4 mb-8">
          <Link href="/book">
            <button className="p-2 rounded-full hover:bg-yellow-100 transition">
              <ArrowLeft className="w-6 h-6" style={{color: COLORS.brown}} />
            </button>
          </Link>
          <ShoppingCart className="w-8 h-8 sm:w-10 sm:h-10" style={{color: COLORS.brownDark}} />
          <h1 className="text-3xl sm:text-4xl font-extrabold" style={{color: COLORS.brownDark}}>Your Shopping Cart</h1>
        </header>

        {cartItems.length === 0 ? (
          <div className="text-center py-20 bg-white/60 rounded-2xl shadow-sm border border-yellow-200/50">
            <ShoppingCart className="w-24 h-24 mx-auto text-yellow-300" />
            <h2 className="mt-6 text-2xl font-semibold" style={{color: COLORS.brownDark}}>Your cart is empty</h2>
            <p className="mt-2 text-base" style={{color: COLORS.brown}}>Looks like you haven’t added anything to your cart yet.</p>
            <Link href="/book">
              <button className="mt-6 font-bold py-3 px-8 rounded-xl text-white transition-all duration-300 shadow-lg hover:shadow-xl" style={{background: `linear-gradient(to right, ${COLORS.yellow}, ${COLORS.yellowDeep})`}}>
                Start Shopping
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div key={item._id} className="flex items-center gap-4 bg-white rounded-2xl shadow-lg p-4 border border-yellow-200/50">
                  <Image
                    src={item.foodId?.image?.asset?.url || item.foodId?.imageUrl || "/placeholder.jpg"}
                    alt={item.foodId?.foodName || 'Food item'}
                    width={96}
                    height={96}
                    className="w-24 h-24 object-cover rounded-xl border-2 border-yellow-100"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold" style={{color: COLORS.brownDark}}>{item.foodId?.foodName}</h3>
                    <p className="text-sm" style={{color: COLORS.brown}}>Shop: {item.foodId?.shopRef?.shopName}</p>
                    <p className="text-sm font-semibold mt-1" style={{color: COLORS.brownDark}}>₹{item.price}</p>
                  </div>
                  <div className="flex flex-col items-end justify-between h-full gap-2">
                    <div className="flex items-center gap-2 border border-gray-200 rounded-full px-2 py-1">
                      <button onClick={() => decrement(item._id)} className="p-1 rounded-full hover:bg-yellow-100 transition"><Minus className="w-4 h-4" style={{color: COLORS.brown}} /></button>
                      <span className="font-bold w-6 text-center" style={{color: COLORS.brownDark}}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item._id, (item.quantity || 0) + 1)} className="p-1 rounded-full hover:bg-yellow-100 transition"><Plus className="w-4 h-4" style={{color: COLORS.brown}} /></button>
                    </div>
                    <div className="text-lg font-bold text-right" style={{color: COLORS.brownDark}}>₹{(item.price || 0) * (item.quantity || 0)}</div>
                    <button onClick={() => deleteItem(item._id)} className="p-1 rounded-full hover:bg-red-100 transition"><Trash2 className="w-4 h-4 text-gray-500 hover:text-red-500" /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-1 sticky top-28">
              <div className="bg-white rounded-2xl shadow-xl border border-yellow-200/50 p-6">
                <h2 className="text-2xl font-bold mb-4 border-b pb-3" style={{color: COLORS.brownDark}}>Order Summary</h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-base">
                    <span style={{color: COLORS.brown}}>Subtotal ({totalItems} items)</span>
                    <span className="font-semibold" style={{color: COLORS.brownDark}}>₹{totalPrice}</span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span style={{color: COLORS.brown}}>Taxes & Charges</span>
                    <span className="font-semibold" style={{color: COLORS.brownDark}}>₹{(totalPrice * 0.05).toFixed(2)}</span>
                  </div>
                </div>
                <div className="border-t my-4"></div>
                <div className="flex justify-between text-xl font-bold mb-6">
                  <span style={{color: COLORS.brownDark}}>Total</span>
                  <span style={{color: COLORS.brownDark}}>₹{(totalPrice * 1.05).toFixed(2)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full font-bold py-3 px-6 rounded-xl text-white transition-all duration-300 shadow-lg hover:shadow-xl text-lg disabled:opacity-50"
                  style={{background: `linear-gradient(to right, ${COLORS.yellow}, ${COLORS.yellowDeep})`}}
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="max-w-6xl mx-auto mt-16 px-4">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6" style={{color: COLORS.brownDark}}>Active Orders</h2>
        {ordersLoading ? (
          <div className="text-center p-8 bg-white/60 rounded-2xl"><p style={{color: COLORS.brown}}>Loading your orders...</p></div>
        ) : ordersError ? (
          <div className="text-center p-8 bg-red-50 text-red-600 rounded-2xl">Error: {ordersError}</div>
        ) : orders.length === 0 ? (
          <div className="text-center p-8 bg-white/60 rounded-2xl shadow-sm border border-yellow-200/50">
            <p style={{color: COLORS.brown}}>You have no active orders at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-2xl shadow-lg p-5 border border-yellow-200/50">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="font-bold text-lg" style={{color: COLORS.brownDark}}>Order #{order.orderId || order._id.slice(-6)}</div>
                  {getStatusBadge(order.status)}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-gray-500">Date</p><p className="font-semibold" style={{color: COLORS.brown}}>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</p></div>
                  <div><p className="text-gray-500">Items</p><p className="font-semibold" style={{color: COLORS.brown}}>{order.items?.map(i => `${i.foodName} (x${i.quantity})`).join(", ") || order.foodName}</p></div>
                  <div><p className="text-gray-500">Shop</p><p className="font-semibold" style={{color: COLORS.brown}}>{order.shopName || 'N/A'}</p></div>
                  <div><p className="text-gray-500">Total</p><p className="font-bold text-base" style={{color: COLORS.brownDark}}>₹{order.total}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BuyNowPopup
        isOpen={showBuyNowPopup}
        onClose={() => setShowBuyNowPopup(false)}
        cartItems={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={deleteItem}
        onPlaceOrder={handleOrderPlaced}
        userDetails={user ? {
          userId: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          name: user.fullName || undefined,
          phone: user.phoneNumbers[0]?.phoneNumber
        } : undefined}
      />
    </div>
  );
};

export default CartPage;
