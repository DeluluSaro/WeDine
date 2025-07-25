"use client";
import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { ShoppingCart } from "lucide-react";
import { useCart } from '../../components/CartContext';
import Image from 'next/image';
import OrderPaymentModal from "@/components/OrderPaymentModal";
import { useRazorpay } from '@/components/razorpayLoader';

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
  paymentStatus?: boolean; // Added paymentStatus
  foodImageUrl?: string; // Added foodImageUrl
  foodImage?: string; // Added foodImage
}

// Add CartItem type for cart items
interface CartItem {
  _id: string;
  foodId: {
    image?: { asset?: { url?: string } };
    imageUrl?: string;
    foodName?: string;
    shopRef?: { shopName?: string };
  };
  price: number;
  quantity: number;
}

// Add RazorpayPaymentResponse type
interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// CartPage component
const CartPage = () => {
  const { user } = useUser();
  const { cartItems, decrement, deleteItem, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [buyNowSuccessId, setBuyNowSuccessId] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null); // NEW: error for cart actions
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [modalItems, setModalItems] = useState<CartItem[]>([]);
  const [modalTotal, setModalTotal] = useState(0);
  const [modalSingleBuy, setModalSingleBuy] = useState(false);
  const [modalBuyItemId, setModalBuyItemId] = useState<string | null>(null);
  const razorpayCheckout = useRazorpay();

  useEffect(() => {
    if (!user) return;
    const fetchOrders = () => {
      setOrdersLoading(true);
      setOrdersError(null);
      fetch(`/api/orders?userId=${user.id}`)
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
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 2 * 60 * 1000); // 2 minutes
    return () => clearInterval(interval);
  }, [user]);

  const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);

  // Helper to convert CartItem[] to OrderItem[] for modal
  const getOrderItemsForModal = (items: CartItem[]) =>
    items.map(item => ({
      foodName: item.foodId?.foodName || '',
      quantity: item.quantity,
      price: item.price,
    }));

  // Open modal for cart checkout
  const openCheckoutModal = () => {
    setModalItems(cartItems);
    setModalTotal(totalPrice);
    setModalSingleBuy(false);
    setShowPaymentModal(true);
  };

  // Open modal for single buy now
  const openBuyNowModal = (item: CartItem) => {
    setModalItems([item]);
    setModalTotal(item.price * item.quantity);
    setModalSingleBuy(true);
    setModalBuyItemId(item._id);
    setShowPaymentModal(true);
  };

  // Razorpay payment handler for modal
  const handleOnlinePayment = async () => {
    if (!user) return;
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      setCartError('Razorpay Key ID is missing. Please set NEXT_PUBLIC_RAZORPAY_KEY_ID in your .env.local file.');
      setLoading(false);
      return;
    }
    console.log('Razorpay Key (frontend):', process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
    const itemsToOrder = modalSingleBuy && modalBuyItemId
      ? cartItems.filter(i => i._id === modalBuyItemId)
      : cartItems;
    // 1. Create order(s) in backend
    const orderRes = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        userEmail: user.primaryEmailAddress?.emailAddress,
        items: itemsToOrder,
        total: itemsToOrder.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0),
        createdAt: new Date().toISOString(),
        paymentMethod: 'online',
      }),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok || !orderData.orderIds) {
      setCartError(orderData.error || 'Failed to create order.');
      setLoading(false);
      return;
    }
    // 2. Create Razorpay order
    const razorpayOrderRes = await fetch('/api/create-razorpay-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: itemsToOrder.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0),
        receipt: orderData.orderIds[0],
      }),
    });
    const razorpayOrderData = await razorpayOrderRes.json();
    if (!razorpayOrderRes.ok || !razorpayOrderData.order) {
      setCartError(razorpayOrderData.error || 'Failed to create Razorpay order.');
      setLoading(false);
      return;
    }
    // 3. Open Razorpay Checkout
    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: razorpayOrderData.order.amount,
      currency: razorpayOrderData.order.currency,
      name: 'WeDine',
      description: 'Order Payment',
      order_id: razorpayOrderData.order.id,
      handler: async function (response: RazorpayPaymentResponse) {
        // 4. On payment success, verify and update order
        const verifyRes = await fetch('/api/verify-razorpay-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderData.orderIds[0],
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          }),
        });
        const verifyData = await verifyRes.json();
        if (verifyRes.ok && verifyData.success) {
          setLoading(false);
          window.location.reload();
        } else {
          setCartError(verifyData.error || 'Payment verification failed.');
          setLoading(false);
        }
      },
      prefill: {
        email: user.primaryEmailAddress?.emailAddress,
      },
      theme: { color: '#F59E42' },
    };
    const result = await razorpayCheckout(options);
    if (result === false) {
      setCartError('Failed to open Razorpay payment window. Please check your internet connection and Razorpay Key ID.');
      setLoading(false);
    }
  };

  // Place order after modal confirm
  const handleModalConfirm = (paymentMethod: 'cod' | 'online') => {
    if (paymentMethod === 'cod') {
      setShowPaymentModal(false);
      setCartError(null);
      setLoading(true);
      if (!user) {
        setCartError("User not found. Please sign in again.");
        setLoading(false);
        return;
      }
      const itemsToOrder = modalSingleBuy && modalBuyItemId
        ? cartItems.filter(i => i._id === modalBuyItemId)
        : cartItems;
      fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.primaryEmailAddress?.emailAddress,
          items: itemsToOrder,
          total: itemsToOrder.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0),
          createdAt: new Date().toISOString(),
          paymentMethod,
        }),
      }).then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          setCartError(data.error || "Failed to place order.");
          setLoading(false);
          return;
        }
        if (modalSingleBuy && modalBuyItemId) {
          deleteItem(modalBuyItemId);
          setBuyNowSuccessId(modalBuyItemId);
          setTimeout(() => setBuyNowSuccessId(null), 2000);
        } else {
          clearCart();
        }
        setLoading(false);
      }).catch(() => {
        setCartError("Failed to place order. Please try again.");
        setLoading(false);
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-200 via-yellow-100 to-beige-100 pb-12">
      <OrderPaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handleModalConfirm}
        items={getOrderItemsForModal(modalItems)}
        totalPrice={modalTotal}
        onOnlinePayment={handleOnlinePayment}
      />
      <FloatingNav navItems={[{ name: "Book", link: "/book", icon: <ShoppingCart /> }]} showBadges={true} cartCount={totalItems} eWalletAmount={500} />
      <div className="max-w-3xl mx-auto pt-32 px-4">
        <h1 className="text-4xl font-extrabold text-yellow-800 mb-8 flex items-center gap-3">
          <ShoppingCart className="w-8 h-8 text-yellow-600" />
          Your Cart
        </h1>
        {cartError && (
          <div className="mb-4 p-3 rounded-xl bg-red-100 text-red-700 font-semibold text-center border border-red-300">
            {cartError}
          </div>
        )}
        <div className="bg-white/80 rounded-2xl shadow-xl p-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="text-lg font-bold text-yellow-700">Total Items: <span className="text-yellow-900">{totalItems}</span></div>
          <div className="text-lg font-bold text-yellow-700">Total Price: <span className="text-yellow-900">₹{totalPrice}</span></div>
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
                  <div className="flex flex-col items-end gap-2 min-w-[120px]">
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
                    </div>
                    <div className="text-lg font-bold text-yellow-900">₹{item.price * item.quantity}</div>
                    <button
                      onClick={() => openBuyNowModal(item)}
                      disabled={false} // Removed buyNowLoadingId === item._id
                      className={`mt-1 w-full bg-gradient-to-r from-blue-400 to-blue-500 text-white font-bold py-2 px-4 rounded-xl hover:from-blue-500 hover:to-blue-600 transition-all duration-200 shadow ${false ? 'opacity-60 cursor-not-allowed' : ''}`} // Removed buyNowLoadingId === item._id
                    >
                      {false ? 'Processing...' : 'Buy Now'} {/* Removed buyNowLoadingId === item._id */}
                    </button>
                    {buyNowSuccessId === item._id && (
                      <div className="text-green-600 text-xs font-semibold mt-1">Purchased!</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={openCheckoutModal}
              disabled={loading}
              className="mt-8 w-full bg-gradient-to-r from-green-400 to-green-500 text-white font-bold py-4 px-6 rounded-2xl hover:from-green-500 hover:to-green-600 transition-all duration-200 shadow-lg hover:shadow-xl text-xl"
            >
              {loading ? "Placing Order..." : "Checkout"}
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
            {orders.map((order, idx) => {
              let statusColor = 'bg-gray-400 text-gray-900';
              const statusText = order.status || 'Ordered';
              if (statusText.toLowerCase() === 'ready') statusColor = 'bg-green-500 text-white animate-pulse';
              else if (statusText.toLowerCase() === 'delivered') statusColor = 'bg-gray-500 text-white';
              else if (statusText.toLowerCase() === 'ordered') statusColor = 'bg-red-500 text-white animate-pulse';
              else if (statusText.toLowerCase() === 'order accepted') statusColor = 'bg-yellow-500 text-white';

              return (
                <div
                  key={order._id}
                  className={`relative bg-white/90 rounded-3xl shadow-2xl border border-yellow-100 p-6 flex items-center gap-6 transition-transform duration-300 hover:scale-[1.025] hover:shadow-yellow-200 animate-fade-in-up`}
                  style={{ animationDelay: `${idx * 0.07}s` }}
                >
                  <div className="flex-shrink-0">
                    <Image
                      src={order.foodImageUrl || order.foodImage || "/placeholder.jpg"}
                      alt={order.foodName || "Food image"}
                      width={64}
                      height={64}
                      className="w-16 h-16 object-cover rounded-2xl border-2 border-yellow-200 shadow-lg"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-extrabold text-lg text-yellow-900 truncate">Order #{order.orderId || order._id}</div>
                      <span className={`px-4 py-1 rounded-full font-bold text-sm shadow-md border-2 border-white/40 ${statusColor} transition-all duration-300`}>{statusText}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold ${order.paymentStatus ? 'text-green-600' : 'text-red-600'}`}>Payment: {order.paymentStatus ? (<><span>Paid</span> <span>✔️</span></>) : (<><span>Unpaid</span> <span>❌</span></>)} </span>
                      <span className="text-xs text-yellow-600 ml-2">{order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      <div className="text-sm text-yellow-800 font-semibold truncate">{order.foodName}</div>
                      <div className="text-sm text-yellow-800 truncate">Shop: {order.shopName}</div>
                      <div className="text-sm text-yellow-800">Total: <span className="font-bold">₹{order.total !== undefined && order.total !== null && order.total !== 0 ? order.total : 'N/A'}</span></div>
                    </div>
                  </div>
                  {/* Animated accent bar */}
                  <div className={`absolute left-0 top-0 h-full w-2 rounded-l-3xl ${statusText.toLowerCase() === 'ready' ? 'bg-green-400 animate-pulse' : statusText.toLowerCase() === 'delivered' ? 'bg-gray-400' : 'bg-red-400 animate-pulse'}`}></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage; 