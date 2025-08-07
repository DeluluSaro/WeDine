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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <FloatingNav navItems={navItems} showBadges={true} />
      
      <div className="pt-20 sm:pt-24 lg:pt-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-blue-800 mb-4 flex items-center gap-2 sm:gap-3">
              <History className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              My Orders
            </h1>
            <p className="text-sm sm:text-base text-blue-700">
              Track your orders and view order history
            </p>
          </div>

          {/* Order Type Toggle */}
          <div className="mb-6">
            <div className="flex bg-white/80 backdrop-blur-sm rounded-xl p-1 shadow-lg max-w-xs">
              <button
                onClick={() => setOrderType('active')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  orderType === 'active'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
              >
                Active Orders
              </button>
              <button
                onClick={() => setOrderType('history')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  orderType === 'history'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
              >
                Order History
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Orders Grid */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-6 hover:shadow-2xl transition-all duration-300 border border-white/30"
                >
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                        Order #{order.orderId || order._id.slice(-8)}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {new Date(order.createdAt || '').toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(order.status || '')}
                      <span className={`text-xs sm:text-sm font-medium px-2 py-1 rounded-full ${getStatusColor(order.status || '')}`}>
                        {order.status || 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Items:</span>
                      <span className="font-medium">{getTotalItems(order)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-bold text-blue-600">₹{order.total || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Payment:</span>
                      <span className={`font-medium ${order.paymentStatus ? 'text-green-600' : 'text-orange-600'}`}>
                        {order.paymentStatus ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Shop Names */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">Shops:</p>
                    <div className="flex flex-wrap gap-1">
                      {getShopNames(order).map((shopName, index) => (
                        <span
                          key={index}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                        >
                          {shopName}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Items:</p>
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {order.items?.map((item, index) => (
                        <div key={index} className="flex justify-between text-xs">
                          <span className="text-gray-700 truncate">{item.foodName}</span>
                          <span className="text-gray-500">x{item.quantity}</span>
                        </div>
                      )) || (
                        <div className="text-xs text-gray-500">
                          {order.foodName} x{order.quantityOrdered}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Zap className="w-3 h-3" />
                      {order.paymentMethod || 'COD'}
                    </div>
                    {order.lifecycleNotes && (
                      <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                        {order.lifecycleNotes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && orders.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No {orderType === 'active' ? 'Active' : ''} Orders
              </h3>
              <p className="text-gray-600 text-sm">
                {orderType === 'active' 
                  ? "You don't have any active orders at the moment."
                  : "Your order history will appear here."
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;