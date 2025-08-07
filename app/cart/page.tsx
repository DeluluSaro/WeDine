"use client";
import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { ShoppingCart } from "lucide-react";
import { useCart } from '../../components/CartContext';
import BuyNowPopup from '@/components/BuyNowPopup';
import Image from 'next/image';

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

// CartPage component
const CartPage = () => {
  const { user } = useUser();
  const { cartItems, decrement, deleteItem, updateQuantity } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [showBuyNowPopup, setShowBuyNowPopup] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  useEffect(() => {
    if (!user) return;
    setOrdersLoading(true);
    setOrdersError(null);
    fetch(`/api/orders?userId=${user.id}&type=active`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to fetch orders');
        return res.json();
      })
      .then((data) => {
        setOrders(data.orders || []);
        setOrdersLoading(false);
      })
      .catch((err) => {
        setOrdersError(err.message);
        setOrdersLoading(false);
      });
  }, [user]);

  const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);

  const handleCheckout = () => {
    if (!user || cartItems.length === 0) return;
    setShowBuyNowPopup(true);
  };

  const handlePlaceOrder = async () => {
    if (!user || cartItems.length === 0) return;
    
    setIsPlacingOrder(true);
    try {
      // The BuyNowPopup now handles the order creation and cart clearing internally
      // This function is called after successful order placement
      
      // Refresh orders list
      const ordersResponse = await fetch(`/api/orders?userId=${user.id}&type=active`);
      if (ordersResponse.ok) {
        const data = await ordersResponse.json();
        setOrders(data.orders || []);
      }
      
      // Note: Cart clearing is now handled automatically in BuyNowPopup
      // The cartItems will be updated automatically through the CartContext
      
    } catch (error) {
      console.error('Error refreshing orders:', error);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-200 via-yellow-100 to-beige-100 pb-12">
      <FloatingNav navItems={[{ name: "Book", link: "/book", icon: <ShoppingCart /> }]} showBadges={true} cartCount={totalItems} eWalletAmount={500} />
      <div className="max-w-3xl mx-auto pt-20 sm:pt-32 px-4">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-yellow-800 mb-6 sm:mb-8 flex items-center gap-2 sm:gap-3">
          <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
          Your Cart
        </h1>
        <div className="bg-white/80 rounded-2xl shadow-xl p-4 sm:p-6 mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <div className="text-base sm:text-lg font-bold text-yellow-700">Total Items: <span className="text-yellow-900">{totalItems}</span></div>
          <div className="text-base sm:text-lg font-bold text-yellow-700">Total Price: <span className="text-yellow-900">₹{totalPrice}</span></div>
        </div>
        {cartItems.length === 0 ? (
          <div className="text-center text-yellow-600 text-xl">Your cart is empty.</div>
        ) : (
          <>
            <div className="space-y-6">
              {cartItems.map((item) => (
                <div key={item._id} className="flex items-center gap-4 bg-white/70 rounded-xl shadow p-4 border border-yellow-100">
                  <Image
                    src={item.foodId?.image?.asset?.url || item.foodId?.imageUrl || "/placeholder.jpg"}
                    alt={item.foodId?.foodName}
                    width={80}
                    height={80}
                    className="w-20 h-20 object-cover rounded-xl border border-yellow-200"
                  />
                  <div className="flex-1">
                    <div className="text-xl font-bold text-yellow-800">{item.foodId?.foodName}</div>
                    <div className="text-sm text-yellow-700">Shop: {item.foodId?.shopRef?.shopName}</div>
                    <div className="text-sm text-yellow-700">Price: ₹{item.price} x {item.quantity}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => decrement(item._id)}
                      className="w-8 h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center hover:bg-yellow-600 transition"
                      aria-label="Remove one"
                    >-</button>
                    <button
                      onClick={() => deleteItem(item._id)}
                      className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition"
                      aria-label="Delete item"
                    >🗑️</button>
                    <div className="text-lg font-bold text-yellow-900">₹{item.price * item.quantity}</div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleCheckout}
              disabled={isPlacingOrder}
              className="mt-8 w-full bg-gradient-to-r from-green-400 to-green-500 text-white font-bold py-4 px-6 rounded-2xl hover:from-green-500 hover:to-green-600 transition-all duration-200 shadow-lg hover:shadow-xl text-xl"
            >
              {isPlacingOrder ? "Placing Order..." : "Checkout"}
            </button>
          </>
        )}
      </div>
      {/* Past Orders Section */}
      <div className="max-w-3xl mx-auto mt-16">
        <h2 className="text-3xl font-bold text-yellow-800 mb-6">Your Past Orders</h2>
        {ordersLoading ? (
          <div className="text-yellow-700">Loading orders...</div>
        ) : ordersError ? (
          <div className="text-red-600">{ordersError}</div>
        ) : orders.length === 0 ? (
          <div className="text-yellow-600">No past orders found.</div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order._id} className="bg-white/70 rounded-xl shadow p-4 border border-yellow-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-yellow-800">Order #{order.orderId || order._id}</div>
                  <div className="text-sm text-yellow-600">{order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</div>
                </div>
                <div className="text-yellow-700 mb-2">Status: <span className="font-semibold">{order.status || 'Ordered'}</span></div>
                <div className="space-y-1">
                  <div className="text-sm text-yellow-800">Food: {order.foodName || (order.items && order.items.map((i) => i.foodName).join(', '))}</div>
                  <div className="text-sm text-yellow-800">Shop: {order.shopName || ''}</div>
                  <div className="text-sm text-yellow-800">Quantity: {order.quantityOrdered || (order.items && order.items.reduce((sum, i) => sum + (i.quantity || 0), 0))}</div>
                  <div className="text-sm text-yellow-800">Total: ₹{order.total || ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buy Now Popup */}
      <BuyNowPopup
        isOpen={showBuyNowPopup}
        onClose={() => setShowBuyNowPopup(false)}
        cartItems={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={deleteItem}
        onPlaceOrder={handlePlaceOrder}
        isLoading={isPlacingOrder}
        userDetails={user ? {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          name: user.fullName || undefined,
          phone: user.phoneNumbers[0]?.phoneNumber
        } : undefined}
      />
    </div>
  );
};

export default CartPage; 