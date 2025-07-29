"use client";
import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { BookIcon, HomeIcon, InfoIcon, MailIcon, CheckCircle, Clock, Truck, Package, History, Zap } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

interface OrderItem {
  foodName: string;
  quantity: number;
  price: number;
  shopId?: string;
  shopName?: string;
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
  paymentMethod?: string;
  archivedAt?: string;
  originalOrderId?: string;
  lifecycleNotes?: string;
  paymentStatus?: boolean;
  orderStatus?: boolean;
}

const OrdersPage = () => {
  const { user } = useUser();
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<'active' | 'history'>('history');

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    fetch(`/api/orders?userId=${user.id}&type=${orderType}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to fetch orders');
        return res.json();
      })
      .then((data) => {
        setOrders(data.orders || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [user, orderType]);

  const navItems = [
    { name: "Home", link: "/", icon: <HomeIcon /> },
    { name: "Book", link: "/book", icon: <BookIcon /> },
    { name: "About", link: "/about", icon: <InfoIcon /> },
    { name: "Contact", link: "/contact", icon: <MailIcon /> },
  ];

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'out for delivery':
        return <Truck className="w-5 h-5 text-blue-600" />;
      case 'preparing':
        return <Package className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'text-green-600 bg-green-100';
      case 'out for delivery':
        return 'text-blue-600 bg-blue-100';
      case 'preparing':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Helper function to get shop name from order items
  const getShopName = (order: Order): string => {
    if (order.shopName) return order.shopName;
    if (order.items && order.items.length > 0) {
      // Get the first shop name from items
      const firstItem = order.items[0];
      if (firstItem.shopName) return firstItem.shopName;
    }
    return 'Multiple Shops'; // Fallback for multi-vendor orders
  };

  // Helper function to get all unique shop names
  const getShopNames = (order: Order): string[] => {
    if (order.items && order.items.length > 0) {
      const shopNames = order.items
        .map(item => item.shopName)
        .filter((name, index, arr) => name && arr.indexOf(name) === index); // Remove duplicates
      return shopNames.length > 0 ? shopNames : ['Unknown Shop'];
    }
    return [order.shopName || 'Unknown Shop'];
  };

  // Helper function to get total items count
  const getTotalItems = (order: Order): number => {
    if (order.items && order.items.length > 0) {
      return order.items.reduce((sum, item) => sum + item.quantity, 0);
    }
    return order.quantityOrdered || 0;
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-200 via-yellow-100 to-beige-100">
      <FloatingNav navItems={navItems} showBadges={true} cartCount={0} eWalletAmount={500} />
      
      <div className="max-w-4xl mx-auto pt-32 px-4 pb-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-yellow-800 mb-4">Your Orders</h1>
          <p className="text-yellow-700 text-lg">Track your food orders and delivery status</p>
        </div>

        {/* Order Type Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/70 rounded-full p-1 shadow-lg">
            <button
              onClick={() => setOrderType('active')}
              className={`px-6 py-3 rounded-full font-semibold transition-all duration-200 flex items-center gap-2 ${
                orderType === 'active'
                  ? 'bg-yellow-500 text-yellow-900 shadow-md'
                  : 'text-yellow-700 hover:text-yellow-900'
              }`}
            >
              <Zap className="w-4 h-4" />
              Active Orders
            </button>
            <button
              onClick={() => setOrderType('history')}
              className={`px-6 py-3 rounded-full font-semibold transition-all duration-200 flex items-center gap-2 ${
                orderType === 'history'
                  ? 'bg-yellow-500 text-yellow-900 shadow-md'
                  : 'text-yellow-700 hover:text-yellow-900'
              }`}
            >
              <History className="w-4 h-4" />
              Order History
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
            <p className="mt-4 text-yellow-800 font-semibold">Loading your orders...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">😔</div>
            <h2 className="text-2xl font-bold text-yellow-800 mb-2">Oops! Something went wrong</h2>
            <p className="text-yellow-700 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-bold py-3 px-6 rounded-full hover:from-yellow-500 hover:to-yellow-600 transition-all duration-200 shadow-lg"
            >
              Try Again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🍽️</div>
            <h2 className="text-2xl font-bold text-yellow-800 mb-2">
              {orderType === 'active' ? 'No Active Orders' : 'No Order History'}
            </h2>
            <p className="text-yellow-700 mb-6">
              {orderType === 'active' 
                ? 'You have no active orders at the moment.' 
                : 'Start your food journey by placing your first order!'
              }
            </p>
            <button 
              onClick={() => router.push('/book')}
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-bold py-3 px-6 rounded-full hover:from-yellow-500 hover:to-yellow-600 transition-all duration-200 shadow-lg"
            >
              Browse Food
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order._id} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-yellow-100 shadow-lg hover:shadow-xl transition-shadow">
                {/* Header with Order ID and Status */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-yellow-100 p-3 rounded-full">
                      {getStatusIcon(order.status || 'ordered')}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-yellow-800">
                        Order #{order.orderId || order._id.slice(-8)}
                      </h3>
                      <p className="text-sm text-yellow-600">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Date not available'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order.status || 'ordered')}`}>
                      {order.status || 'Ordered'}
                    </div>
                    {order.paymentStatus && (
                      <div className="mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        ✅ Paid
                      </div>
                    )}
                  </div>
                </div>

                {/* Shop Information */}
                <div className="mb-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                  <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                    🏪 Restaurant
                  </h4>
                  <div className="text-yellow-700">
                    {getShopNames(order).length === 1 ? (
                      <span className="font-medium">{getShopNames(order)[0]}</span>
                    ) : (
                      <div>
                        <span className="font-medium">Multiple Restaurants:</span>
                        <ul className="mt-1 ml-4 space-y-1">
                          {getShopNames(order).map((shop, index) => (
                            <li key={index} className="text-sm">• {shop}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                      🍽️ Order Items
                    </h4>
                    <div className="space-y-2">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                            <div>
                              <span className="font-medium text-yellow-800">{item.foodName}</span>
                              <span className="text-sm text-yellow-600 ml-2">× {item.quantity}</span>
                            </div>
                            <span className="font-semibold text-yellow-700">₹{item.price * item.quantity}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                          <span className="font-medium text-yellow-800">{order.foodName || 'Food item'}</span>
                          <span className="font-semibold text-yellow-700">₹{order.total}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                      💳 Payment Details
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                        <span className="text-yellow-700">Payment Method:</span>
                        <span className="font-medium text-yellow-800">
                          {order.paymentMethod === 'online' ? '💳 Online Payment' : '💵 Cash on Delivery'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                        <span className="text-yellow-700">Total Items:</span>
                        <span className="font-medium text-yellow-800">{getTotalItems(order)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-yellow-100 rounded-lg border border-yellow-200">
                        <span className="font-semibold text-yellow-800">Total Amount:</span>
                        <span className="font-bold text-lg text-yellow-800">₹{order.total}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Messages */}
                {order.status?.toLowerCase() === 'delivered' && (
                  <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-center gap-3 text-green-800">
                      <CheckCircle className="w-6 h-6" />
                      <div>
                        <span className="font-semibold">Order delivered successfully!</span>
                        <p className="text-sm text-green-600 mt-1">Thank you for choosing WeDine!</p>
                      </div>
                    </div>
                  </div>
                )}

                {order.lifecycleNotes && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="text-sm text-blue-800">
                      <strong>📝 Note:</strong> {order.lifecycleNotes}
                    </div>
                  </div>
                )}

                {order.archivedAt && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-xs text-gray-500">
                      📁 Archived: {new Date(order.archivedAt).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;