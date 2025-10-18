'use client';

import { useState, useEffect } from 'react';
import { client } from '@/sanity/lib/client';
import { writeClient } from '@/sanity/lib/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Eye, RefreshCw, LogOut, CreditCard, Wifi, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
// import { environment, debugLog } from '@/app/lib/environment';

interface OrderItem {
  foodName: string;
  quantity: number;
  price: number;
  shopName: string;
}

interface Order {
  _id: string;
  orderId?: string;
  orderIdentifier?: string;
  shortOrderId?: string;
  userId: string;
  userEmail: string;
  userPhone?: string;
  rfidCardId?: string;
  items: OrderItem[];
  total: number;
  paymentMethod: 'cod' | 'online';
  status: string;
  orderStatus: boolean;
  paymentStatus: boolean;
  requiredRfidCardId?: string;
  createdAt: string;
  updatedAt: string;
  userDetails?: {
    name?: string;
    phone?: string;
    address?: string;
  };
  deliveredAt?: string;
  adminNotes?: string;
}

interface Shop {
  _id: string;
  shopName: string;
}

const statusOptions = [
  { value: 'ordered', label: 'Ordered' },
  { value: 'order accepted', label: 'Order Accepted' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'out for delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>('all');
  const [isShopFilterLocked, setIsShopFilterLocked] = useState<boolean>(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [orderType, setOrderType] = useState<'active' | 'history'>('active');
  const [loading, setLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [statusUpdates, setStatusUpdates] = useState<{ [key: string]: string }>({});
  const [updateQueue, setUpdateQueue] = useState<string[]>([]);
  const [adminSession, setAdminSession] = useState<{ shopName: string; username: string } | null>(null);
  const [rfidMode, setRfidMode] = useState(false);
  const [rfidDeviceStatus, setRfidDeviceStatus] = useState<'offline' | 'online' | 'unknown'>('unknown');
  const [rfidInput, setRfidInput] = useState('');
  const [selectedOrderForRfid, setSelectedOrderForRfid] = useState<Order | null>(null);
  const [isListeningToRfid, setIsListeningToRfid] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [connectionRetries, setConnectionRetries] = useState(0);
  const [maxRetries] = useState(5);
  const [isManualScanning, setIsManualScanning] = useState(false);
  const [showOrderIdPopup, setShowOrderIdPopup] = useState(false);
  const [popupOrderId, setPopupOrderId] = useState<string>('');
  const [popupTimer, setPopupTimer] = useState<NodeJS.Timeout | null>(null);
  const [verifyOrderMode, setVerifyOrderMode] = useState(false);
  const [currentFirebaseRfid, setCurrentFirebaseRfid] = useState<{ 
    cardId: string; 
    timestamp: string; 
    shopName: string;
    studentName?: string;
    userEmail?: string;
    deviceId?: string;
    isVerified?: boolean;
  } | null>(null);
  const [rfidOrders, setRfidOrders] = useState<Order[]>([]);
  const [isLoadingRfidOrders, setIsLoadingRfidOrders] = useState(false);
  const [manualOrderIdInput, setManualOrderIdInput] = useState<string>('');
  const [verifiedOrder, setVerifiedOrder] = useState<Order | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
    fetchShops();
  }, [orderType]);

  // Fetch latest RFID data when admin session is loaded
  useEffect(() => {
    if (adminSession?.shopName) {
      fetchLatestRfidData();
    }
  }, [adminSession?.shopName]);

  // Continuous RFID scanning when RFID mode is enabled
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (rfidMode && adminSession?.shopName) {
      // Start continuous scanning every 2 seconds
      intervalId = setInterval(() => {
        fetchLatestRfidData();
      }, 2000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [rfidMode, adminSession?.shopName]);

  useEffect(() => {
    // Load admin session
    const session = localStorage.getItem('adminSession');
    if (session) {
      try {
        const parsedSession = JSON.parse(session);
        setAdminSession(parsedSession);
        
        // Auto-filter by shop name if admin session exists
        if (parsedSession.shopName) {
          setSelectedShop(parsedSession.shopName);
          setIsShopFilterLocked(true);
        }
      } catch (error) {
        console.error('Error parsing admin session:', error);
        handleLogout();
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminSession');
    router.push('/admin-login');
    toast.success('Logged out successfully');
  };

  const handleShopFilterChange = (value: string) => {
    if (isShopFilterLocked) {
      toast.error('Shop filter is locked to your assigned shop');
      return;
    }
    setSelectedShop(value);
  };

  const fetchOrders = async (forceRefresh = false) => {
    try {
      let query;
      if (orderType === 'history') {
        query = `
          *[_type == "orderHistory"] | order(createdAt desc) {
            _id,
            orderId,
            orderIdentifier,
            userId,
            userEmail,
            userPhone,
            items,
            total,
            paymentMethod,
            status,
            orderStatus,
            paymentStatus,
            createdAt,
            updatedAt,
            archivedAt,
            originalOrderId,
            lifecycleNotes,
            paymentDetails
          }
        `;
      } else {
        query = `
          *[_type == "order" && isArchived != true] | order(createdAt desc) {
            _id,
            orderId,
            orderIdentifier,
            userId,
            userEmail,
            userPhone,
            items,
            total,
            paymentMethod,
            status,
            orderStatus,
            paymentStatus,
            requiredRfidCardId,
            createdAt,
            updatedAt,
            expiresAt,
            isArchived,
            archivedAt,
            paymentDetails
          }
        `;
      }
      
      // Use writeClient for force refresh to bypass CDN
      const clientToUse = forceRefresh ? writeClient : client;
      const result = await clientToUse.fetch(query);
      console.log(`Fetched ${orderType} orders (forceRefresh: ${forceRefresh}):`, result);
      setOrders(result);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchShops = async () => {
    try {
      const query = `
        *[_type == "shop"] | order(shopName asc) {
          _id,
          shopName
        }
      `;
      const result = await client.fetch(query);
      setShops(result);
    } catch (error) {
      console.error('Error fetching shops:', error);
    }
  };

  const fetchLatestRfidData = async (retryCount = 0, isManual = false) => {
    if (!adminSession?.shopName) return;
    
    if (isManual) {
      setIsManualScanning(true);
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`/api/rfid/current?shopName=${encodeURIComponent(adminSession.shopName)}`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        
        // Check if we have RFID data from Firebase
        if (data.success && data.rfidData && data.rfidData.cardId) {
          const currentCardId = data.rfidData.cardId;
          
          // Validate card ID format (should be alphanumeric and reasonable length)
          if (currentCardId.length >= 4 && currentCardId.length <= 20 && /^[A-F0-9]+$/i.test(currentCardId)) {
            console.log(`RFID card detected from Firebase: ${currentCardId}`);
            setRfidInput(currentCardId);
            
            // If manual scan, also update the input field
            if (isManual) {
              console.log(`Manual scan - RFID card: ${currentCardId}`);
            }
          } else {
            console.warn(`Invalid RFID card format: ${currentCardId}`);
            if (isManual) {
              setRfidInput('');
            }
          }
        } else {
          console.log('No RFID data found in Firebase');
          if (isManual) {
            setRfidInput('');
          }
        }
        
        setRfidDeviceStatus('online');
        setConnectionRetries(0); // Reset retry count on successful connection
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching latest RFID data:', error);
      setRfidDeviceStatus('offline');
      
      // Implement retry logic
      if (retryCount < maxRetries) {
        console.log(`Retrying connection... (${retryCount + 1}/${maxRetries})`);
        setConnectionRetries(retryCount + 1);
        setTimeout(() => {
          fetchLatestRfidData(retryCount + 1, isManual);
        }, Math.pow(2, retryCount) * 1000); // Exponential backoff
      } else {
        console.error('Max retries reached. Connection failed.');
        setConnectionRetries(maxRetries);
      }
    } finally {
      if (isManual) {
        setIsManualScanning(false);
      }
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrder(orderId);
    try {
      // Security check: If shop filter is locked, verify the order belongs to the admin's shop
      if (isShopFilterLocked && adminSession?.shopName) {
        const order = orders.find(o => o._id === orderId);
        if (order && !order.items.some(item => item.shopName === adminSession.shopName)) {
          toast.error('You can only update orders from your assigned shop');
          setUpdatingOrder(null);
          return;
        }
      }
      
      console.log('Updating order status:', { orderId, newStatus }); // Debug log
      
      const response = await fetch('/api/admin/update-order-status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          status: newStatus,
        }),
      });

      const result = await response.json();
      console.log('Update response:', result); // Debug log

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update order status');
      }

      toast.success('Order status updated successfully');
      
      // Remove from queue and status updates
      setUpdateQueue(prev => prev.filter(id => id !== orderId));
      setStatusUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[orderId];
        return newUpdates;
      });
      
      // Refresh the orders to show updated status
      await fetchOrders(true); // Force refresh to bypass CDN
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error(`Failed to update order status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUpdatingOrder(null);
    }
  };

  // const addToUpdateQueue = (orderId: string, newStatus: string) => {
  //   setStatusUpdates(prev => ({ ...prev, [orderId]: newStatus }));
  //   setUpdateQueue(prev => [...prev, orderId]);
  // };

  const removeFromQueue = (orderId: string) => {
    setUpdateQueue(prev => prev.filter(id => id !== orderId));
    setStatusUpdates(prev => {
      const newUpdates = { ...prev };
      delete newUpdates[orderId];
      return newUpdates;
    });
  };

  const processQueue = async () => {
    if (updateQueue.length === 0) return;
    
    const promises = updateQueue.map(orderId => {
      const newStatus = statusUpdates[orderId];
      if (newStatus) {
        return updateOrderStatus(orderId, newStatus);
      }
    });
    
    await Promise.all(promises);
  };

  const getOrderIdentifier = (order: Order) => {
    return order.orderIdentifier || order.orderId || order._id;
  };

  const getShortOrderId = (order: Order) => {
    return order.shortOrderId || '';
  };

  const parseEmailToName = (email: string) => {
    if (!email) return '';
    const atIndex = email.indexOf('@');
    if (atIndex === -1) return email;
    
    let name = email.substring(0, atIndex);
    
    // Remove year patterns (4 digits at the end or after a dot)
    // Matches patterns like .2021, .2022, 2021, 2022, etc.
    name = name.replace(/\.\d{4}$/, ''); // Remove .2021, .2022, etc.
    name = name.replace(/\d{4}$/, '');   // Remove 2021, 2022, etc. at the end
    
    return name;
  };


  const toggleRfidMode = () => {
    setRfidMode(!rfidMode);
    if (!rfidMode) {
      // Enable RFID mode - manual scanning only
      startListeningToRfid();
    } else {
      // Disable RFID mode
      stopListeningToRfid();
    }
  };

  const processRfidPayment = async (rfidCardId: string, order: Order) => {
    try {
      console.log('Processing RFID payment:', { rfidCardId, orderId: order._id, shopName: adminSession?.shopName });
      
      const response = await fetch('/api/payment/rfid-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rfidCardId: rfidCardId,
          orderId: order._id,
          shopName: adminSession?.shopName || 'SHOP_001'
        }),
      });

      const result = await response.json();
      console.log('Payment result:', result);

      if (result.success) {
        // Show payment success message
        let successMessage = `Payment successful! ₹${result.orderTotal} paid by ${result.studentName} for Order #${order.orderId || order._id.slice(-6)}. New balance: ₹${result.newBalance}`;
        
        // Add transfer status to message
        if (result.transferToShopOwner) {
          if (result.transferToShopOwner.success) {
            successMessage += `\n💰 Money transferred to shop owner (Payout ID: ${result.transferToShopOwner.payoutId})`;
          } else {
            successMessage += `\n⚠️ Payment processed but transfer to shop owner failed: ${result.transferToShopOwner.error}`;
          }
        } else {
          successMessage += `\n⚠️ Shop owner payment details not configured`;
        }
        
        // Show order ID popup for 15 seconds
        if (order.shortOrderId) {
          showOrderIdPopupFor15Seconds(order.shortOrderId);
        }
        
        toast.success(successMessage);
        setRfidInput(''); // Clear RFID input
        setSelectedOrderForRfid(null); // Clear selected order
        fetchOrders(true); // Refresh orders
      } else {
        toast.error(result.message || 'Payment failed');
        console.error('Payment failed:', result);
      }
    } catch (error) {
      console.error('RFID payment error:', error);
      toast.error('Failed to process RFID payment');
    }
  };

  const simulateRfidScan = (order: Order) => {
    // This simulates an RFID scan - in real implementation, this would come from the device
    const rfidCardId = prompt('Enter RFID Card ID (simulated scan):');
    if (rfidCardId) {
      processRfidPayment(rfidCardId, order);
    }
  };


  const startListeningToRfid = async () => {
    // Manual scanning only - no automatic polling
    console.log('Manual RFID scanning enabled');
    setIsListeningToRfid(true);
  };

  const stopListeningToRfid = () => {
    if ((window as unknown as { rfidInterval?: NodeJS.Timeout }).rfidInterval) {
      clearInterval((window as unknown as { rfidInterval: NodeJS.Timeout }).rfidInterval);
      (window as unknown as { rfidInterval: NodeJS.Timeout | null }).rfidInterval = null;
    }
    setIsListeningToRfid(false);
    setRfidDeviceStatus('offline');
  };

  // Show order ID popup for 15 seconds
  const showOrderIdPopupFor15Seconds = (orderId: string) => {
    setPopupOrderId(orderId);
    setShowOrderIdPopup(true);
    
    // Clear any existing timer
    if (popupTimer) {
      clearTimeout(popupTimer);
    }
    
    // Set timer to hide popup after 15 seconds
    const timer = setTimeout(() => {
      setShowOrderIdPopup(false);
      setPopupOrderId('');
      setPopupTimer(null);
    }, 15000);
    
    setPopupTimer(timer);
  };

  // Close order ID popup manually
  const closeOrderIdPopup = () => {
    setShowOrderIdPopup(false);
    setPopupOrderId('');
    
    // Clear the timer if it exists
    if (popupTimer) {
      clearTimeout(popupTimer);
      setPopupTimer(null);
    }
  };

  // Toggle verify order mode
  const toggleVerifyOrderMode = () => {
    setVerifyOrderMode(!verifyOrderMode);
    if (verifyOrderMode) {
      // Clear verification state when disabling
      setCurrentFirebaseRfid(null);
      setRfidOrders([]);
    }
  };

  // Get current RFID from Firebase Realtime Database
  const getCurrentRfidFromFirebase = async () => {
    if (!adminSession?.shopName) {
      toast.error('Shop name not available');
      return;
    }

    try {
      const response = await fetch(`/api/rfid/current?shopName=${encodeURIComponent(adminSession.shopName)}`);
      const result = await response.json();

      if (response.ok && result.success) {
        setCurrentFirebaseRfid(result.rfidData);
      } else {
        setCurrentFirebaseRfid(null);
        toast.error(result.error || 'Failed to get RFID from Firebase');
      }
    } catch (error) {
      console.error('Error getting RFID from Firebase:', error);
      setCurrentFirebaseRfid(null);
      toast.error('Failed to get RFID from Firebase');
    }
  };

  // Fetch orders by RFID card
  const fetchOrdersByRfid = async (rfidCardId: string) => {
    if (!rfidCardId.trim()) {
      toast.error('Please enter RFID card ID');
      return;
    }

    setIsLoadingRfidOrders(true);
    try {
      const response = await fetch(`/api/orders/by-rfid?rfidCardId=${encodeURIComponent(rfidCardId.trim())}`);
      const result = await response.json();

      if (response.ok && result.success) {
        setRfidOrders(result.orders);
      } else {
        setRfidOrders([]);
        toast.error(result.error || 'No orders found for this RFID card');
      }
    } catch (error) {
      console.error('Error fetching RFID orders:', error);
      setRfidOrders([]);
      toast.error('Failed to fetch orders for RFID card');
    } finally {
      setIsLoadingRfidOrders(false);
    }
  };

  // Handle order action based on payment status
  const handleOrderAction = async (order: Order) => {
    if (order.paymentMethod === 'cod' || order.status === 'pending') {
      // Unpaid order - transfer to RFID payment
      setSelectedOrderForRfid(order);
      setRfidInput(currentFirebaseRfid?.cardId || '');
      setRfidMode(true);
      setVerifyOrderMode(false);
      toast.info('Order transferred to RFID payment mode');
    } else if (order.status === 'paid' || order.status === 'completed') {
      // Paid order - show order ID popup
      if (order.shortOrderId) {
        showOrderIdPopupFor15Seconds(order.shortOrderId);
      } else {
        toast.error('Order ID not found for this order');
      }
    } else {
      toast.info(`Order status: ${order.status}`);
    }
  };

  // Verify order by manual order ID input
  const verifyOrderByManualId = async () => {
    if (!manualOrderIdInput.trim()) {
      toast.error('Please enter an order ID');
      return;
    }

    const orderId = manualOrderIdInput.trim().toUpperCase();
    
    try {
      const response = await fetch('/api/orders/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          orderId: orderId
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setVerifiedOrder(result.order);
        toast.success(`Order verified! Found order for ${result.order.userDetails?.name || 'Unknown User'}`);
      } else {
        setVerifiedOrder(null);
        toast.error(result.error || 'Order not found. Please check the order ID.');
      }
    } catch (error) {
      console.error('Order verification error:', error);
      setVerifiedOrder(null);
      toast.error('Failed to verify order. Please try again.');
    }
  };

  // Clear manual verification
  const clearManualVerification = () => {
    setManualOrderIdInput('');
    setVerifiedOrder(null);
  };




  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if ((window as unknown as { rfidInterval?: NodeJS.Timeout }).rfidInterval) {
        clearInterval((window as unknown as { rfidInterval: NodeJS.Timeout }).rfidInterval);
      }
      if (popupTimer) {
        clearTimeout(popupTimer);
      }
    };
  }, [popupTimer]);

  const handleDirectRfidPayment = async () => {
    // Prevent multiple clicks
    if (isProcessingPayment) {
      toast.error('Payment is already being processed. Please wait...');
      return;
    }

    if (!rfidInput.trim()) {
      toast.error('Please enter RFID card ID');
      return;
    }

    if (!selectedOrderForRfid) {
      toast.error('Please select an order first');
      return;
    }

    setIsProcessingPayment(true);
    try {
      await processRfidPayment(rfidInput.trim(), selectedOrderForRfid);
      setRfidInput('');
      setSelectedOrderForRfid(null);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    // Security: If shop filter is locked, force filter by admin's shop
    let effectiveShopFilter = selectedShop;
    if (isShopFilterLocked && adminSession?.shopName) {
      effectiveShopFilter = adminSession.shopName;
    }
    
    // Filter by shop
    const shopMatch = effectiveShopFilter === 'all' || 
      order.items.some(item => item.shopName === effectiveShopFilter);
    
    // Filter by status
    const statusMatch = selectedStatus === 'all' || order.status === selectedStatus;
    
    // Filter by search term - prioritize 5-character order ID
    const searchMatch = searchTerm === '' || 
      getShortOrderId(order).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getOrderIdentifier(order).toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.userPhone && order.userPhone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.userDetails?.name && order.userDetails.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return shopMatch && statusMatch && searchMatch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ordered': return 'default';
      case 'order accepted': return 'secondary';
      case 'preparing': return 'outline';
      case 'out for delivery': return 'outline';
      case 'delivered': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusClassName = (status: string) => {
    switch (status) {
      case 'ordered': return 'bg-blue-100 text-blue-800';
      case 'order accepted': return 'bg-yellow-100 text-yellow-800';
      case 'preparing': return 'bg-orange-100 text-orange-800';
      case 'out for delivery': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (paymentStatus: boolean) => {
    return paymentStatus ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-200 text-red-900 border-red-400 font-semibold';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };


  const getOrderItemsByShop = (order: Order) => {
    const itemsByShop: { [key: string]: OrderItem[] } = {};
    order.items.forEach(item => {
      if (!itemsByShop[item.shopName]) {
        itemsByShop[item.shopName] = [];
      }
      itemsByShop[item.shopName].push(item);
    });
    // Convert to array format for easier mapping
    return Object.entries(itemsByShop).map(([shopName, items]) => ({
      shopName,
      items
    }));
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Admin Dashboard
              </h1>
              {adminSession && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-600">
                  <span>Shop: <span className="font-semibold text-blue-600">{adminSession.shopName}</span></span>
                  <span className="hidden sm:inline">•</span>
                  <span>User: <span className="font-semibold">{adminSession.username}</span></span>
                  {isShopFilterLocked && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span className="text-blue-600 font-medium">🔒 Shop Filter Locked</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>


          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="shop-filter" className="text-sm font-medium">
                Filter by Shop
                {isShopFilterLocked && (
                  <span className="ml-2 text-xs text-blue-600 font-normal">(Locked to your shop)</span>
                )}
              </Label>
              <Select 
                value={selectedShop} 
                onValueChange={handleShopFilterChange}
                disabled={isShopFilterLocked}
              >
                <SelectTrigger 
                  id="shop-filter" 
                  className={isShopFilterLocked ? 'bg-blue-50 border-blue-200' : ''}
                >
                  <SelectValue placeholder="All Shops" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shops</SelectItem>
                  {shops.map((shop) => (
                    <SelectItem key={shop._id} value={shop.shopName}>
                      {shop.shopName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isShopFilterLocked && (
                <p className="text-xs text-blue-600">
                  🔒 Shop filter is locked to your assigned shop
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter" className="text-sm font-medium">Filter by Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm font-medium">Search Orders</Label>
              <div className="relative">
                <Input
                  id="search"
                  placeholder="5-char Order ID (ABC12), Email, Mobile, Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
                {searchTerm && searchTerm.length === 5 && /^[A-Z0-9]{5}$/i.test(searchTerm) && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                      Order ID
                    </span>
                  </div>
                )}
              </div>
              {searchTerm && (
                <div className="text-xs text-gray-500">
                  Searching in: Order IDs, Customer names, emails, and phone numbers
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Order Type</Label>
              <div className="flex gap-2">
                <Button
                  variant={orderType === 'active' ? 'default' : 'outline'}
                  onClick={() => setOrderType('active')}
                  className="flex-1 text-sm"
                >
                  Active
                </Button>
                <Button
                  variant={orderType === 'history' ? 'default' : 'outline'}
                  onClick={() => setOrderType('history')}
                  className="flex-1 text-sm"
                >
                  History
                </Button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Button
              onClick={() => fetchOrders(true)}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            {updateQueue.length > 0 && (
              <Button
                onClick={processQueue}
                variant="secondary"
                className="flex items-center gap-2"
              >
                Process Queue ({updateQueue.length})
              </Button>
            )}

            {/* RFID Payment Button */}
            <Button
              onClick={toggleRfidMode}
              variant={rfidMode ? "default" : "outline"}
              className={`flex items-center gap-2 ${
                rfidMode 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'border-green-600 text-green-600 hover:bg-green-50'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              {rfidMode ? 'RFID Auto-Scan ON' : 'Enable RFID Auto-Scan'}
            </Button>

            {/* Verify Order Button */}
            <Button
              onClick={toggleVerifyOrderMode}
              variant={verifyOrderMode ? "default" : "outline"}
              className={`flex items-center gap-2 ${
                verifyOrderMode 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'border-purple-600 text-purple-600 hover:bg-purple-50'
              }`}
            >
              <Eye className="h-4 w-4" />
              {verifyOrderMode ? 'Verify Order ON' : 'Verify Order'}
            </Button>

            {/* RFID Finder Link */}
            <Button
              onClick={() => {
                const url = adminSession?.shopName 
                  ? `/rfid-finder?shop=${encodeURIComponent(adminSession.shopName)}`
                  : '/rfid-finder';
                window.open(url, '_blank');
              }}
              variant="outline"
              className="flex items-center gap-2 border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <Smartphone className="h-4 w-4" />
              RFID Finder
              {adminSession?.shopName && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">
                  {adminSession.shopName}
                </span>
              )}
            </Button>


            {/* RFID Device Status */}
            {rfidMode && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <Wifi className={`h-4 w-4 ${
                  rfidDeviceStatus === 'online' ? 'text-green-500' : 
                  rfidDeviceStatus === 'offline' ? 'text-red-500' : 'text-yellow-500'
                }`} />
                <span className="text-sm font-medium">
                  Device: {rfidDeviceStatus === 'online' ? 'Online' : 
                          rfidDeviceStatus === 'offline' ? 'Offline' : 'Unknown'}
                </span>
              </div>
            )}

            {/* Simplified RFID Payment Section */}
            {rfidMode && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  RFID Payment
                </h3>
                
                <div className="space-y-4">
                  {/* Order Selection */}
                  <div>
                    <Label htmlFor="order-select" className="text-sm font-medium text-gray-700 mb-2 block">
                      Select Order to Pay
                    </Label>
                    <Select 
                      value={selectedOrderForRfid?._id || ''} 
                      onValueChange={(orderId) => {
                        const order = orders.find(o => o._id === orderId);
                        setSelectedOrderForRfid(order || null);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose an unpaid order..." />
                      </SelectTrigger>
                      <SelectContent>
                        {orders
                          .filter(order => 
                            !order.paymentStatus && 
                            order.items.some(item => item.shopName === adminSession?.shopName)
                          )
                          .map((order) => (
                            <SelectItem key={order._id} value={order._id}>
                              Order #{order.orderId || order._id.slice(-6)} - ₹{order.total} - {parseEmailToName(order.userEmail)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* RFID Card Input */}
                  <div>
                    <Label htmlFor="rfid-input" className="text-sm font-medium text-gray-700 mb-2 block">
                      Scanned RFID Card ID
                      {rfidMode && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                          Auto-Scanning
                        </span>
                      )}
                    </Label>
                    <Input
                      id="rfid-input"
                      type="text"
                      value={rfidInput}
                      readOnly
                      placeholder={rfidMode ? "Scanning for RFID cards..." : "RFID card will appear here automatically when scanned..."}
                      className={`w-full font-mono text-lg p-3 border-2 rounded-lg ${
                        rfidInput 
                          ? 'bg-green-50 border-green-300 text-green-800' 
                          : rfidMode 
                            ? 'bg-blue-50 border-blue-300 text-blue-600' 
                            : 'bg-white border-gray-300'
                      }`}
                    />
                    {rfidInput && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">
                          ✅ Valid RFID card detected and ready for payment
                        </p>
                        <p className="text-xs text-green-500 mt-1">
                          Card ID: {rfidInput}
                        </p>
                      </div>
                    )}
                    {rfidMode && !rfidInput && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-600 font-medium">
                          🔍 Scanning for RFID cards...
                        </p>
                        <p className="text-xs text-blue-500 mt-1">
                          Place RFID card near the reader
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        setRfidInput('');
                        setSelectedOrderForRfid(null);
                        setIsProcessingPayment(false);
                        setConnectionRetries(0); // Reset connection retries
                        setIsManualScanning(false); // Reset manual scanning state
                        stopListeningToRfid();
                      }}
                      variant="outline"
                      className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                      disabled={isProcessingPayment}
                    >
                      Clear
                    </Button>
                    
                    <Button
                      onClick={() => {
                        fetchLatestRfidData(0, true); // Manual scan
                      }}
                      variant="outline"
                      className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isProcessingPayment || isManualScanning}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isManualScanning ? 'animate-spin' : ''}`} />
                      {isManualScanning ? 'Scanning...' : 'Scan'}
                    </Button>
                    
                    
                    {connectionRetries >= maxRetries && (
                      <Button
                        onClick={() => {
                          setConnectionRetries(0);
                          startListeningToRfid();
                        }}
                        variant="outline"
                        className="flex-1 border-purple-600 text-purple-600 hover:bg-purple-50"
                        disabled={isProcessingPayment}
                      >
                        <Wifi className="h-4 w-4 mr-2" />
                        Reconnect
                      </Button>
                    )}
                    
                    <Button
                      onClick={handleDirectRfidPayment}
                      disabled={!rfidInput.trim() || !selectedOrderForRfid || isProcessingPayment}
                      className="flex-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                    >
                      {isProcessingPayment ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Start Pay'
                      )}
                    </Button>
                  </div>

                  {/* Status Display */}
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium ${
                        isProcessingPayment ? 'text-orange-600' :
                        isManualScanning ? 'text-blue-600' :
                        isListeningToRfid ? 'text-blue-600' : 
                        rfidInput ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {isProcessingPayment ? 'Processing payment...' :
                         isManualScanning ? 'Scanning for latest card...' :
                         isListeningToRfid ? 'RFID mode enabled - click Scan to check for cards' : 
                         rfidInput ? 'RFID card ready for payment' : 'Click Scan button to check for RFID cards...'}
                      </span>
                    </div>
                    {adminSession?.shopName && (
                      <div className="text-xs text-gray-500 mt-1">
                        Shop: {adminSession.shopName}
                      </div>
                    )}
                    {rfidInput && (
                      <div className="text-xs text-gray-500 mt-1">
                        Card ID: {rfidInput}
                      </div>
                    )}
                    {selectedOrderForRfid && (
                      <div className="text-xs text-blue-600 mt-1">
                        Selected: Order #{selectedOrderForRfid.orderId || selectedOrderForRfid._id.slice(-6)} - ₹{selectedOrderForRfid.total}
                      </div>
                    )}
                    {connectionRetries > 0 && connectionRetries < maxRetries && (
                      <div className="text-xs text-orange-600 mt-1">
                        🔄 Reconnecting... (Attempt {connectionRetries}/{maxRetries})
                      </div>
                    )}
                    {connectionRetries >= maxRetries && (
                      <div className="text-xs text-red-600 mt-1">
                        ❌ Connection failed. Please try again.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

        {/* Verify Order Section */}
        {verifyOrderMode && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
            <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Order Verification
            </h3>
            
            <div className="space-y-4">
              {/* Manual Order ID Verification */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Manual Order ID Verification</h4>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={manualOrderIdInput}
                    onChange={(e) => setManualOrderIdInput(e.target.value.toUpperCase())}
                    placeholder="Enter 5-character order ID..."
                    className="flex-1 font-mono text-lg p-3 bg-white border-2 border-gray-300 rounded-lg"
                    maxLength={5}
                  />
                  <Button
                    onClick={verifyOrderByManualId}
                    disabled={!manualOrderIdInput.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6"
                  >
                    Verify Order
                  </Button>
                  <Button
                    onClick={clearManualVerification}
                    variant="outline"
                    className="border-gray-300"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Manual Verification Result */}
              {verifiedOrder && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <h4 className="font-semibold text-green-800">Order Verified Successfully!</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-green-700 font-medium">Order Details:</p>
                      <div className="bg-white p-3 rounded border mt-2">
                        <p className="font-mono text-lg font-bold text-green-800 mb-2">
                          Order ID: {verifiedOrder.shortOrderId}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Customer:</strong> {verifiedOrder.userDetails?.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Email:</strong> {verifiedOrder.userEmail}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Phone:</strong> {verifiedOrder.userDetails?.phone || 'Not provided'}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Total:</strong> ₹{verifiedOrder.total}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Payment:</strong> {verifiedOrder.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online'}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Status:</strong> {verifiedOrder.status}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-green-700 font-medium">Order Items:</p>
                      <div className="bg-white p-3 rounded border mt-2 max-h-40 overflow-y-auto">
                        {verifiedOrder.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-b-0">
                            <div>
                              <p className="text-sm font-medium">{item.foodName}</p>
                              <p className="text-xs text-gray-500">{item.shopName}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">Qty: {item.quantity}</p>
                              <p className="text-sm text-green-600">₹{item.price}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <div className="flex gap-2">
                      {verifiedOrder.status === 'paid' || verifiedOrder.status === 'completed' ? (
                        <Button
                          onClick={() => {
                            if (verifiedOrder.shortOrderId) {
                              showOrderIdPopupFor15Seconds(verifiedOrder.shortOrderId);
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Show Order ID Popup
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            setSelectedOrderForRfid(verifiedOrder);
                            setRfidInput(currentFirebaseRfid?.cardId || '');
                            setRfidMode(true);
                            setVerifyOrderMode(false);
                            toast.info('Order transferred to RFID payment mode');
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Pay with RFID
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Get Current RFID Button */}
              <div className="flex gap-2">
                <Button
                  onClick={getCurrentRfidFromFirebase}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                >
                  <Wifi className="w-4 h-4 mr-2" />
                  Get Current RFID
                </Button>
                <Button
                  onClick={() => {
                    setCurrentFirebaseRfid(null);
                    setRfidOrders([]);
                  }}
                  variant="outline"
                  className="border-gray-300"
                >
                  Clear
                </Button>
              </div>

              {/* Current Firebase RFID Info */}
              {currentFirebaseRfid && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                    <Wifi className="h-4 w-4" />
                    Current Firebase RFID
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Card ID:</span> {currentFirebaseRfid.cardId || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Student:</span> {currentFirebaseRfid.studentName || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {currentFirebaseRfid.userEmail || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Shop:</span> {currentFirebaseRfid.shopName || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Device:</span> {currentFirebaseRfid.deviceId || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Verified:</span> 
                      <span className={`ml-1 ${currentFirebaseRfid.isVerified ? 'text-green-600' : 'text-red-600'}`}>
                        {currentFirebaseRfid.isVerified ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Timestamp:</span> 
                      <span className="ml-1 text-gray-600">
                        {currentFirebaseRfid.timestamp ? new Date(currentFirebaseRfid.timestamp).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Find Orders Button */}
                  {currentFirebaseRfid.cardId && (
                    <div className="mt-3">
                      <Button
                        onClick={() => fetchOrdersByRfid(currentFirebaseRfid.cardId)}
                        disabled={isLoadingRfidOrders}
                        className="bg-purple-600 hover:bg-purple-700 text-white w-full"
                      >
                        {isLoadingRfidOrders ? 'Loading...' : 'Find Orders for this RFID'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Orders List for RFID Card */}
              {rfidOrders.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-4">
                    Orders for RFID Card ({rfidOrders.length} total)
                  </h4>
                  
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {rfidOrders.map((order) => (
                      <div 
                        key={order._id} 
                        className="border rounded-lg p-3 transition-colors hover:border-gray-300"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-mono text-lg font-bold text-purple-800">
                                {order.shortOrderId}
                              </span>
                              <span className="text-sm text-gray-600">
                                Order #{order.orderIdentifier?.split('-')[1]?.slice(-6) || order._id.slice(-8)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mb-1">
                              ₹{order.total} • {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(order.createdAt).toLocaleDateString()} • {order.items.length} item(s)
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              order.status === 'paid' || order.status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : order.status === 'pending' || order.paymentMethod === 'cod'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status === 'paid' || order.status === 'completed' ? 'PAID' : 
                               order.status === 'pending' || order.paymentMethod === 'cod' ? 'UNPAID' : 
                               order.status.toUpperCase()}
                            </div>
                            
                            <Button
                              onClick={() => handleOrderAction(order)}
                              size="sm"
                              className={`${
                                order.status === 'paid' || order.status === 'completed'
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                            >
                              {order.status === 'paid' || order.status === 'completed' ? 'Show Order ID' : 'Pay with RFID'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
          </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statusOptions.map((status) => {
            const count = filteredOrders.filter(order => order.status === status.value).length;
            return (
              <Card key={status.value} className={`p-4 ${isShopFilterLocked ? 'border-blue-200 bg-blue-50/30' : ''}`}>
                <CardContent className="p-0">
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-600">{status.label}</div>
                  {isShopFilterLocked && (
                    <div className="text-xs text-blue-600 mt-1">
                      For {adminSession?.shopName}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex flex-col">
              <span>{orderType === 'active' ? 'Active' : 'Historical'} Orders ({filteredOrders.length})</span>
                {isShopFilterLocked && (
                  <span className="text-sm font-normal text-blue-600 mt-1">
                    🔒 Filtered by: {adminSession?.shopName}
                  </span>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="text-gray-400 text-lg mb-2">
                            {isShopFilterLocked ? '🏪' : '📋'}
                          </div>
                          <div className="text-gray-500 text-lg font-medium mb-1">
                            No orders found
                          </div>
                          <div className="text-gray-400 text-sm">
                            {isShopFilterLocked 
                              ? `No orders found for ${adminSession?.shopName}` 
                              : 'Try adjusting your filters or search terms'
                            }
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                    <tr 
                      key={order._id} 
                      className={`hover:bg-gray-50 ${updateQueue.includes(order._id) ? 'bg-blue-50' : ''}`}
                      data-order-id={order.shortOrderId}
                    >
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex flex-col">
                          {order.shortOrderId && (
                            <span className="font-mono text-lg font-bold text-purple-800">
                              {order.shortOrderId}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {getOrderIdentifier(order)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{parseEmailToName(order.userEmail)}</div>
                          <div className="text-gray-500 text-xs">{order.userPhone || order.userId}</div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">
                        <div className="max-w-xs">
                          {getOrderItemsByShop(order).map((shopGroup, index) => {
                            const isAdminShop = isShopFilterLocked && adminSession?.shopName && shopGroup.shopName === adminSession.shopName;
                            return (
                              <div key={index} className={`mb-2 ${isAdminShop ? 'bg-blue-50 p-2 rounded border border-blue-200' : ''}`}>
                                <div className={`font-medium text-xs ${isAdminShop ? 'text-blue-700' : 'text-gray-500'}`}>
                                  {shopGroup.shopName}
                                  {isAdminShop && <span className="ml-1 text-blue-600">🏪</span>}
                                </div>
                              {shopGroup.items.map((item, itemIndex) => (
                                <div key={itemIndex} className="text-xs">
                                  {item.foodName} x{item.quantity}
                                </div>
                              ))}
                            </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                        <span className={`font-semibold ${
                          order.paymentMethod === 'cod' 
                            ? 'text-gray-700' 
                            : order.paymentStatus 
                              ? 'text-green-600' 
                              : 'text-red-600'
                        }`}>
                          ₹{order.total}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col gap-1">
                          <Badge variant={order.paymentMethod === 'online' ? 'default' : 'secondary'}>
                            {order.paymentMethod.toUpperCase()}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={getPaymentStatusColor(order.paymentStatus)}
                          >
                            {order.paymentStatus ? 'Paid' : 'Pending'}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(order.status)} className={getStatusClassName(order.status)}>
                            {order.status}
                          </Badge>
                          {updateQueue.includes(order._id) && (
                            <div className="flex items-center gap-1 text-xs text-blue-600">
                              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                              → {statusUpdates[order._id]}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex items-center gap-1"
                                disabled={Boolean(isShopFilterLocked && adminSession?.shopName && !order.items.some(item => item.shopName === adminSession.shopName))}
                              >
                                <Eye className="h-3 w-3" />
                                <span className="hidden sm:inline">View</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Order Details</DialogTitle>
                              </DialogHeader>
                              {isShopFilterLocked && adminSession?.shopName && !order.items.some(item => item.shopName === adminSession.shopName) ? (
                                <div className="text-center py-8">
                                  <div className="text-gray-400 text-lg mb-2">🚫</div>
                                  <div className="text-gray-500 text-lg font-medium mb-1">Access Denied</div>
                                  <div className="text-gray-400 text-sm">
                                    You can only view orders from your assigned shop: {adminSession.shopName}
                                  </div>
                                </div>
                              ) : (
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Order ID</Label>
                                    <p className="text-sm text-gray-600">{getOrderIdentifier(order)}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Customer</Label>
                                    <p className="text-sm text-gray-600 font-medium">{parseEmailToName(order.userEmail)}</p>
                                    <p className="text-xs text-gray-500">{order.userPhone || order.userId}</p>
                                    <p className="text-xs text-gray-400">({order.userEmail})</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Total Amount</Label>
                                    <p className={`text-sm font-semibold ${
                                      order.paymentMethod === 'cod' 
                                        ? 'text-gray-700' 
                                        : order.paymentStatus 
                                          ? 'text-green-600' 
                                          : 'text-red-600'
                                    }`}>
                                      ₹{order.total}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Payment Method</Label>
                                    <p className="text-sm text-gray-600">{order.paymentMethod.toUpperCase()}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Payment Status</Label>
                                    <Badge 
                                      variant="outline" 
                                      className={getPaymentStatusColor(order.paymentStatus)}
                                    >
                                      {order.paymentStatus ? 'Paid' : 'Pending'}
                                    </Badge>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Order Status</Label>
                                    <Badge variant={getStatusColor(order.status)} className={getStatusClassName(order.status)}>
                                      {order.status}
                                    </Badge>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Created At</Label>
                                    <p className="text-sm text-gray-600">{formatDate(order.createdAt)}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Updated At</Label>
                                    <p className="text-sm text-gray-600">{formatDate(order.updatedAt)}</p>
                                  </div>
                                </div>
                                
                                <div>
                                  <Label className="text-sm font-medium">Order Items</Label>
                                  <div className="mt-2 space-y-2">
                                    {getOrderItemsByShop(order).map((shopGroup, index) => {
                                      const isAdminShop = isShopFilterLocked && adminSession?.shopName && shopGroup.shopName === adminSession.shopName;
                                      return (
                                        <div key={index} className={`border rounded-lg p-3 ${isAdminShop ? 'border-blue-300 bg-blue-50' : ''}`}>
                                          <div className={`font-medium text-sm mb-2 ${isAdminShop ? 'text-blue-900' : 'text-gray-900'}`}>
                                            {shopGroup.shopName}
                                            {isAdminShop && <span className="ml-2 text-blue-600">🏪 Your Shop</span>}
                                          </div>
                                        {shopGroup.items.map((item, itemIndex) => (
                                          <div key={itemIndex} className="flex justify-between text-sm">
                                            <span>{item.foodName} x{item.quantity}</span>
                                            <span>₹{item.price * item.quantity}</span>
                                          </div>
                                        ))}
                                      </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          <div className="flex flex-col gap-2">
                            <Select
                              value={statusUpdates[order._id] || ''}
                              onValueChange={(value) => {
                                if (value) {
                                  setStatusUpdates(prev => ({ ...prev, [order._id]: value }));
                                }
                              }}
                              disabled={Boolean(isShopFilterLocked && adminSession?.shopName && !order.items.some(item => item.shopName === adminSession.shopName))}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Update Status" />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((status) => (
                                  <SelectItem key={status.value} value={status.value}>
                                    {status.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            {statusUpdates[order._id] && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => updateOrderStatus(order._id, statusUpdates[order._id])}
                                  disabled={updatingOrder === order._id || Boolean(isShopFilterLocked && adminSession?.shopName && !order.items.some(item => item.shopName === adminSession.shopName))}
                                  className="flex-1"
                                >
                                  ✓
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setStatusUpdates(prev => {
                                      const newUpdates = { ...prev };
                                      delete newUpdates[order._id];
                                      return newUpdates;
                                    });
                                    removeFromQueue(order._id);
                                  }}
                                  disabled={Boolean(isShopFilterLocked && adminSession?.shopName && !order.items.some(item => item.shopName === adminSession.shopName))}
                                  className="flex-1"
                                >
                                  ✕
                                </Button>
                              </div>
                            )}

                            {/* RFID Payment Button */}
                            {rfidMode && !order.paymentStatus && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => simulateRfidScan(order)}
                                className="w-full border-green-600 text-green-600 hover:bg-green-50"
                                disabled={Boolean(isShopFilterLocked && adminSession?.shopName && !order.items.some(item => item.shopName === adminSession.shopName))}
                              >
                                <CreditCard className="h-3 w-3 mr-1" />
                                RFID Pay
                              </Button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order ID Popup - Closable with close button */}
      {showOrderIdPopup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl relative">
            {/* Close button */}
            <button
              onClick={closeOrderIdPopup}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
              aria-label="Close popup"
            >
              ×
            </button>
            
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-8">
              <p className="text-3xl font-black text-yellow-800 tracking-wider">
                {popupOrderId}
              </p>
              <p className="text-sm text-yellow-600 mt-2">Auto-closes in 15 seconds</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 