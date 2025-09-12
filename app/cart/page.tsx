'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { FloatingNav } from '@/components/ui/floating-navbar';
import { ShoppingCart, Home, Book, Trash2, Plus, Minus, ArrowLeft, History, BookOpen } from 'lucide-react';
import { useCart, CartItem } from '../../components/CartContext';
import BuyNowPopup from '@/components/BuyNowPopup';
import Image from 'next/image';
import Link from 'next/link';

interface OrderItem {
  foodName: string;
  quantity: number;
}

interface Order { depot
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
  yellow: '#FFD600',
  yellowDeep: '#FFB300',
  yellowLight: '#FFF9E5',
  beige: '#E5DAC0',
  offWhite: '#FAF8F3',
  shadow: '#786600',
  brown: '#997E2C',
  brownDark: '#6D581C',
};

// CartPage component
const CartPage = () => {
  const { user } = useUser();
  const { cartItems, decrement, deleteItem, updateQuantity, clearCart } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [showBuyNowPopup, setShowBuyNowPopup] = useState(false);
  const [itemsForPopup, setItemsForPopup] = useState<CartItem[]>([]);

  const navItems = [
    { name: 'Home', link: '/', icon: <Home /> },
    { name: 'Book', link: '/book', icon: <BookOpen /> },
    { name: 'History', link: '/orders', icon: <History /> },
    { name: 'Cart', link: '/cart', icon: <ShoppingCart /> },
  ];

  const fetchOrders = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, fetchOrders]);

  const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const handleBuyNow = (items: CartItem[]) => {
    setItemsForPopup(items);
    setShowBuyNowPopup(true);
  };

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to remove all items from your cart?')) {
      clearCart();
    }
  };

  const handleOrderPlaced = useCallback((paymentMethod: 'cod' | 'online') => {
    // The payment method is handled in the popup, we just need to refresh the orders
    fetchOrders();
    setItemsForPopup([]);
  }, [fetchOrders]);

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
  };

  // Group items by shop name
  const itemsByShop = cartItems.reduce((acc, item) => {
    const shopName = item.foodId?.shopRef?.shopName || 'Unknown Shop';
    if (!acc[shopName]) {
      acc[shopName] = [];
    }
    acc[shopName].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);

  return (
    <div className="min-h-screen pb-20" style={{ background: `linear-gradient(180deg, ${COLORS.yellowLight}, ${COLORS.offWhite} 80%)` }}>
      <FloatingNav navItems={navItems} showBadges={true} cartCount={totalItems} eWalletAmount={500} />
      <div className="max-w-6xl mx-auto pt-24 sm:pt-32 px-4">
        <header className="flex items-center gap-4 mb-8">
          <Link href="/book">
            <button className="p-2 rounded-full hover:bg-yellow-100 transition">
              <ArrowLeft className="w-6 h-6" style={{ color: COLORS.brown }} />
            </button>
          </Link>
          <ShoppingCart className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: COLORS.brownDark }} />
          <h1 className="text-3xl sm:text-4xl font-extrabold" style={{ color: COLORS.brownDark }}>Your Shopping Cart</h1>
        </header>

        {cartItems.length === 0 ? (
          <div className="text-center py-20 bg-white/60 rounded-2xl shadow-sm border border-yellow-200/50">
            <ShoppingCart className="w-24 h-24 mx-auto text-yellow-300" />
            <h2 className="mt-6 text-2xl font-semibold" style={{ color: COLORS.brownDark }}>Your cart is empty</h2>
            <p className="mt-2 text-base" style={{ color: COLORS.brown }}>Looks like you haven't added anything to your cart yet.</p>
            <Link href="/book">
              <button className="mt-6 font-bold py-3 px-8 rounded-xl text-white transition-all duration-300 shadow-lg hover:shadow-xl" style={{ background: `linear-gradient(to right, ${COLORS.yellow}, ${COLORS.yellowDeep})` }}>
                Start Shopping
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex justify-between items-baseline pb-2 border-b border-yellow-200/50">
              <h2 className="text-2xl font-bold" style={{ color: COLORS.brownDark }}>Your Items ({totalItems} total)</h2>
              <button onClick={handleClearCart} className="flex items-center gap-1 text-sm font-semibold text-red-500 hover:text-red-700 transition-colors">
                <Trash2 className="w-4 h-4" />
                Clear Entire Cart
              </button>
            </div>

            {Object.entries(itemsByShop).map(([shopName, items]) => {
              const shopTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
              return (
                <div key={shopName} className="bg-white rounded-2xl shadow-xl border border-yellow-200/50 p-6">
                  <h3 className="text-2xl font-bold mb-4 border-b pb-3" style={{ color: COLORS.brownDark }}>{shopName}</h3>
                  <div className="space-y-4 my-4">
                    {items.map((item) => (
                      <div key={item._id} className="grid grid-cols-12 items-center gap-4">
                        <div className="col-span-2">
                          <Image
                            src={item.foodId?.image?.asset?.url || item.foodId?.imageUrl || '/placeholder.jpg'}
                            alt={item.foodId?.foodName || 'Food item'}
                            width={80}
                            height={80}
                            className="w-20 h-20 object-cover rounded-lg border-2 border-yellow-100"
                          />
                        </div>
                        <div className="col-span-6">
                          <h4 className="font-semibold text-gray-800">{item.foodId?.foodName}</h4>
                          <p className="text-sm text-gray-600">₹{item.price}</p>
                        </div>
                        <div className="col-span-4 flex items-center justify-end gap-2">
                          <div className="flex items-center gap-2 border border-gray-200 rounded-full px-2 py-1">
                            <button onClick={() => decrement(item._id)} className="p-1 rounded-full hover:bg-yellow-100 transition">
                              <Minus className="w-4 h-4" style={{ color: COLORS.brown }} />
                            </button>
                            <span className="font-bold w-6 text-center" style={{ color: COLORS.brownDark }}>{item.quantity}</span>
                            <button onClick={() => updateQuantity(item._id, (item.quantity || 0) + 1)} className="p-1 rounded-full hover:bg-yellow-100 transition">
                              <Plus className="w-4 h-4" style={{ color: COLORS.brown }} />
                            </button>
                          </div>
                          <button onClick={() => deleteItem(item._id)} className="p-2 rounded-full hover:bg-red-100 transition">
                            <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-6 pt-4 flex justify-end items-center">
                    <div className="text-lg font-bold mr-4" style={{ color: COLORS.brownDark }}>
                      Shop Total: <span className="text-xl">₹{shopTotal.toFixed(2)}</span>
                    </div>
                    <button onClick={() => handleBuyNow(items)} className="bg-green-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-green-600 transition-all">
                      Buy From This Shop
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto mt-16 px-4">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6" style={{ color: COLORS.brownDark }}>Active Orders</h2>
        {ordersLoading ? (
          <div className="text-center p-8 bg-white/60 rounded-2xl"><p style={{ color: COLORS.brown }}>Loading your orders...</p></div>
        ) : ordersError ? (
          <div className="text-center p-8 bg-red-50 text-red-600 rounded-2xl">Error: {ordersError}</div>
        ) : orders.length === 0 ? (
          <div className="text-center p-8 bg-white/60 rounded-2xl shadow-sm border border-yellow-200/50">
            <p style={{ color: COLORS.brown }}>You have no active orders at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-2xl shadow-lg p-5 border border-yellow-200/50">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="font-bold text-lg" style={{ color: COLORS.brownDark }}>Order #{order.orderId || order._id.slice(-6)}</div>
                  {getStatusBadge(order.status)}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-gray-500">Date</p><p className="font-semibold" style={{ color: COLORS.brown }}>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</p></div>
                  <div><p className="text-gray-500">Items</p><p className="font-semibold" style={{ color: COLORS.brown }}>{order.items?.map((i) => `${i.foodName} (x${i.quantity})`).join(', ') || order.foodName}</p></div>
                  <div><p className="text-gray-500">Shop</p><p className="font-semibold" style={{ color: COLORS.brown }}>{order.shopName || 'N/A'}</p></div>
                  <div><p className="text-gray-500">Total</p><p className="font-bold text-base" style={{ color: COLORS.brownDark }}>₹{order.total}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showBuyNowPopup && (
        <BuyNowPopup
          isOpen={showBuyNowPopup}
          onClose={() => setShowBuyNowPopup(false)}
          cartItems={itemsForPopup}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={deleteItem}
          onPlaceOrder={handleOrderPlaced}
          userDetails={user ? {
            userId: user.id,
            email: user.emailAddresses[0]?.emailAddress,
            name: user.fullName || undefined,
            phone: user.phoneNumbers[0]?.phoneNumber,
          } : undefined}
        />
      )}
    </div>
  );
};

export default CartPage;
