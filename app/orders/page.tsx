"use client";
import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { BookIcon, HomeIcon, InfoIcon, MailIcon, CheckCircle, Clock, Truck, Package, History, Zap, BookOpen, Wallet, CreditCard, Wifi, WifiOff } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  const [rfidPaymentMode, setRfidPaymentMode] = useState<{[key: string]: boolean}>({});
  const [rfidDeviceStatus, setRfidDeviceStatus] = useState<{[key: string]: any}>({});

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

  // Check RFID device status
  const checkRfidDeviceStatus = async (shopId: string) => {
    try {
      const response = await fetch(`/api/payment/rfid/status?shopId=${shopId}`);
      if (response.ok) {
        const data = await response.json();
        setRfidDeviceStatus(prev => ({ ...prev, [shopId]: data }));
      }
    } catch (error) {
      console.error('Error checking RFID device status:', error);
    }
  };

  // Toggle RFID payment mode
  const toggleRfidPaymentMode = async (orderId: string, shopId: string, amount: number) => {
    try {
      const isCurrentlyActive = rfidPaymentMode[orderId];
      
      if (isCurrentlyActive) {
        // Disable RFID payment mode
        setRfidPaymentMode(prev => ({ ...prev, [orderId]: false }));
        toast.success('RFID payment mode disabled');
      } else {
        // Enable RFID payment mode
        const response = await fetch('/api/payment/rfid/enable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            shopId,
            amount,
            userEmail: user?.emailAddresses?.[0]?.emailAddress
          })
        });

        if (response.ok) {
          setRfidPaymentMode(prev => ({ ...prev, [orderId]: true }));
          toast.success('RFID payment mode enabled. Scan your ID card to pay.');
          
          // Start polling for payment status
          startPaymentPolling(orderId);
        } else {
          const errorData = await response.json();
          toast.error(errorData.message || 'Failed to enable RFID payment');
        }
      }
    } catch (error) {
      console.error('Error toggling RFID payment mode:', error);
      toast.error('Failed to toggle RFID payment mode');
    }
  };

  // Start polling for payment status
  const startPaymentPolling = (orderId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payment/rfid/status?orderId=${orderId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.paymentCompleted) {
            clearInterval(pollInterval);
            setRfidPaymentMode(prev => ({ ...prev, [orderId]: false }));
            toast.success('Payment completed successfully!');
            fetchOrders(); // Refresh orders
          }
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setRfidPaymentMode(prev => ({ ...prev, [orderId]: false }));
    }, 300000);
  };

  const navItems = [
    { name: "Home", link: "/", icon: <HomeIcon /> },
    { name: "Book", link: "/book", icon: <BookOpen /> },
    { name: "History", link: "/orders", icon: <History /> },
    { name: "Wallet", link: "/wallet", icon: <Wallet /> },
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
        return 'text-green-700 bg-green-100 border border-green-200';
      case 'out for delivery':
        return 'text-orange-700 bg-orange-100 border border-orange-200';
      case 'preparing':
        return 'text-yellow-700 bg-yellow-100 border border-yellow-200';
      default:
        return 'text-yellow-700 bg-yellow-100 border border-yellow-200';
    }
  };

  // Helper function to get all unique shop names
  const getShopNames = (order: Order): string[] => {
    if (order.items && order.items.length > 0) {
      const shopNames = order.items
        .map(item => item.shopName)
        .filter((name): name is string => name !== undefined) // Type guard to remove undefined
        .filter((name, index, arr) => arr.indexOf(name) === index); // Remove duplicates
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
      <FloatingNav navItems={navItems} showBadges={true} />
      
      <div className="pt-20 sm:pt-24 lg:pt-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-yellow-800 mb-4 flex items-center justify-center gap-3 sm:gap-4">
              <History className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-600" />
              My Orders
            </h1>
            <p className="text-lg sm:text-xl text-yellow-700 font-medium">
              Track your orders and view order history
            </p>
          </div>

          {/* Order Type Toggle */}
          <div className="mb-8 flex justify-center">
            <div className="flex bg-white/80 backdrop-blur-sm rounded-2xl p-2 shadow-xl max-w-md">
              <button
                onClick={() => setOrderType('active')}
                className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold transition-all duration-300 ${
                  orderType === 'active'
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 shadow-lg transform scale-105'
                    : 'text-yellow-700 hover:bg-yellow-50 hover:text-yellow-800'
                }`}
              >
                Active Orders
              </button>
              <button
                onClick={() => setOrderType('history')}
                className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold transition-all duration-300 ${
                  orderType === 'history'
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 shadow-lg transform scale-105'
                    : 'text-yellow-700 hover:bg-yellow-50 hover:text-yellow-800'
                }`}
              >
                Order History
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-600"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-8 text-center">
              <p className="text-red-700 text-lg font-semibold">{error}</p>
            </div>
          )}

          {/* Orders Grid */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-8 hover:shadow-3xl hover:scale-105 transition-all duration-500 border-2 border-yellow-100 hover:border-yellow-200"
                >
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg sm:text-xl mb-2">
                        Order #{order.orderId || order._id.slice(-8)}
                      </h3>
                      <p className="text-sm text-yellow-600 font-medium">
                        {new Date(order.createdAt || '').toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusIcon(order.status || '')}
                      <span className={`text-sm font-bold px-4 py-2 rounded-full ${getStatusColor(order.status || '')}`}>
                        {order.status || 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="space-y-4 mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-semibold">Total Items:</span>
                      <span className="font-bold text-2xl text-yellow-700">{getTotalItems(order)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-semibold">Total Amount:</span>
                      <span className="font-bold text-2xl text-yellow-800">₹{order.total || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-semibold">Payment:</span>
                      <span className={`font-bold px-3 py-1 rounded-full text-sm ${
                        order.paymentStatus 
                          ? 'bg-green-100 text-green-700 border border-green-200' 
                          : 'bg-orange-100 text-orange-700 border border-orange-200'
                      }`}>
                        {order.paymentStatus ? '✅ Paid' : '⏳ Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Shop Names */}
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-3 font-semibold">🏪 Shops:</p>
                    <div className="flex flex-wrap gap-2">
                      {getShopNames(order).map((shopName, index) => (
                        <span
                          key={index}
                          className="text-sm bg-gradient-to-r from-yellow-400 to-orange-400 text-yellow-900 px-3 py-2 rounded-full font-semibold shadow-md"
                        >
                          {shopName}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-3 font-semibold">🍽️ Items:</p>
                    <div className="space-y-2 max-h-24 overflow-y-auto bg-white/60 rounded-xl p-3">
                      {order.items?.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-sm bg-white/80 rounded-lg px-3 py-2">
                          <span className="text-gray-800 font-medium truncate">{item.foodName}</span>
                          <span className="text-yellow-700 font-bold bg-yellow-100 px-2 py-1 rounded-full">x{item.quantity}</span>
                        </div>
                      )) || (
                        <div className="text-sm text-gray-600 bg-white/80 rounded-lg px-3 py-2 text-center">
                          {order.foodName} x{order.quantityOrdered}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RFID Payment Section */}
                  {orderType === 'active' && !order.paymentStatus && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-bold text-blue-800">RFID Payment</h4>
                            <p className="text-sm text-blue-600">Pay instantly with your college ID card</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Device Status Indicator */}
                          <div className="flex items-center gap-2">
                            {rfidDeviceStatus[order.shopName]?.connected ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <Wifi className="w-4 h-4" />
                                <span className="text-xs font-medium">Device Online</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-red-600">
                                <WifiOff className="w-4 h-4" />
                                <span className="text-xs font-medium">Device Offline</span>
                              </div>
                            )}
                          </div>
                          
                          {/* RFID Payment Button */}
                          <button
                            onClick={() => toggleRfidPaymentMode(order._id, order.shopName || '', order.total || 0)}
                            className={`px-4 py-2 rounded-full font-bold text-sm transition-all duration-200 ${
                              rfidPaymentMode[order._id]
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white hover:from-blue-500 hover:to-indigo-600'
                            }`}
                          >
                            {rfidPaymentMode[order._id] ? 'Cancel RFID Payment' : 'Pay with RFID'}
                          </button>
                        </div>
                      </div>
                      
                      {rfidPaymentMode[order._id] && (
                        <div className="mt-4 p-3 bg-blue-100 rounded-xl border border-blue-300">
                          <div className="flex items-center gap-2 text-blue-800">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="font-medium">RFID payment active - Scan your college ID card</span>
                          </div>
                          <p className="text-sm text-blue-600 mt-1">
                            Amount: ₹{order.total} | Order: #{order.orderId || order._id.slice(-6)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Order Footer */}
                  <div className="flex items-center justify-between pt-4 border-t-2 border-yellow-100">
                    <div className="flex items-center gap-2 text-sm text-yellow-700 font-semibold">
                      <Zap className="w-4 h-4" />
                      {order.paymentMethod || 'COD'}
                    </div>
                    {order.lifecycleNotes && (
                      <div className="text-xs text-gray-600 bg-gradient-to-r from-yellow-100 to-orange-100 px-3 py-2 rounded-full border border-yellow-200">
                        📝 {order.lifecycleNotes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && orders.length === 0 && (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <History className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-yellow-800 mb-3">
                No {orderType === 'active' ? 'Active' : ''} Orders
              </h3>
              <p className="text-yellow-700 text-lg max-w-md mx-auto">
                {orderType === 'active' 
                  ? "You don't have any active orders at the moment. Time to order some delicious food! 🍕"
                  : "Your order history will appear here once you start ordering. Let's get started! 🚀"
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