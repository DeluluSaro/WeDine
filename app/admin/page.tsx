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
import { Eye, RefreshCw, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  userId: string;
  userEmail: string;
  userPhone?: string;
  items: OrderItem[];
  total: number;
  paymentMethod: 'cod' | 'online';
  status: string;
  orderStatus: boolean;
  paymentStatus: boolean;
  createdAt: string;
  updatedAt: string;
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
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [orderType, setOrderType] = useState<'active' | 'history'>('active');
  const [loading, setLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusUpdates, setStatusUpdates] = useState<{ [key: string]: string }>({});
  const [updateQueue, setUpdateQueue] = useState<string[]>([]);
  const [adminSession, setAdminSession] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
    fetchShops();
  }, [orderType]);

  useEffect(() => {
    // Load admin session
    const session = localStorage.getItem('adminSession');
    if (session) {
      try {
        setAdminSession(JSON.parse(session));
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

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrder(orderId);
    try {
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

  const addToUpdateQueue = (orderId: string, newStatus: string) => {
    setStatusUpdates(prev => ({ ...prev, [orderId]: newStatus }));
    setUpdateQueue(prev => [...prev, orderId]);
  };

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

  const filteredOrders = orders.filter(order => {
    // Filter by shop
    const shopMatch = selectedShop === 'all' || 
      order.items.some(item => item.shopName === selectedShop);
    
    // Filter by status
    const statusMatch = selectedStatus === 'all' || order.status === selectedStatus;
    
    // Filter by search term
    const searchMatch = searchTerm === '' || 
      getOrderIdentifier(order).toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.userPhone && order.userPhone.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return shopMatch && statusMatch && searchMatch;
  });

  const getStatusColor = (status: string) => {
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

  const getPaymentStatusColor = (paymentStatus: boolean, paymentMethod: string) => {
    if (paymentMethod === 'cod') return 'bg-gray-100 text-gray-800';
    return paymentStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
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

  const getOrderShops = (order: Order) => {
    const shopNames = [...new Set(order.items.map(item => item.shopName))];
    return shopNames.join(', ');
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

  const getOrderIdentifier = (order: Order) => {
    return order.orderIdentifier || order.orderId || order._id;
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
                  <span>Shop: <span className="font-semibold">{adminSession.shopName}</span></span>
                  <span className="hidden sm:inline">•</span>
                  <span>User: <span className="font-semibold">{adminSession.username}</span></span>
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

          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="shop-filter" className="text-sm font-medium">Filter by Shop</Label>
              <Select value={selectedShop} onValueChange={setSelectedShop}>
                <SelectTrigger id="shop-filter">
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
              <Input
                id="search"
                placeholder="Order ID, Email, Mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
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
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statusOptions.map((status) => {
            const count = filteredOrders.filter(order => order.status === status.value).length;
            return (
              <Card key={status.value} className="p-4">
                <CardContent className="p-0">
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-600">{status.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{orderType === 'active' ? 'Active' : 'Historical'} Orders ({filteredOrders.length})</span>
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
                  {filteredOrders.map((order) => (
                    <tr key={order._id} className={`hover:bg-gray-50 ${updateQueue.includes(order._id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {getOrderIdentifier(order)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{order.userEmail}</div>
                          <div className="text-gray-500">{order.userPhone || order.userId}</div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">
                        <div className="max-w-xs">
                          {getOrderItemsByShop(order).map((shopGroup, index) => (
                            <div key={index} className="mb-2">
                              <div className="font-medium text-xs text-gray-500">{shopGroup.shopName}</div>
                              {shopGroup.items.map((item, itemIndex) => (
                                <div key={itemIndex} className="text-xs">
                                  {item.foodName} x{item.quantity}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{order.total}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col gap-1">
                          <Badge variant={order.paymentMethod === 'online' ? 'default' : 'secondary'}>
                            {order.paymentMethod.toUpperCase()}
                          </Badge>
                          <Badge variant={getPaymentStatusColor(order.paymentStatus, order.paymentMethod)}>
                            {order.paymentStatus ? 'Paid' : 'Pending'}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(order.status)}>
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
                              <Button variant="outline" size="sm" className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                <span className="hidden sm:inline">View</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Order Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Order ID</Label>
                                    <p className="text-sm text-gray-600">{getOrderIdentifier(order)}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Customer</Label>
                                    <p className="text-sm text-gray-600">{order.userEmail}</p>
                                    <p className="text-sm text-gray-600">{order.userPhone || order.userId}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Total Amount</Label>
                                    <p className="text-sm text-gray-600">₹{order.total}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Payment Method</Label>
                                    <p className="text-sm text-gray-600">{order.paymentMethod.toUpperCase()}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Payment Status</Label>
                                    <Badge variant={getPaymentStatusColor(order.paymentStatus, order.paymentMethod)}>
                                      {order.paymentStatus ? 'Paid' : 'Pending'}
                                    </Badge>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Order Status</Label>
                                    <Badge variant={getStatusColor(order.status)}>
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
                                    {getOrderItemsByShop(order).map((shopGroup, index) => (
                                      <div key={index} className="border rounded-lg p-3">
                                        <div className="font-medium text-sm text-gray-900 mb-2">{shopGroup.shopName}</div>
                                        {shopGroup.items.map((item, itemIndex) => (
                                          <div key={itemIndex} className="flex justify-between text-sm">
                                            <span>{item.foodName} x{item.quantity}</span>
                                            <span>₹{item.price * item.quantity}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
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
                                  disabled={updatingOrder === order._id}
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
                                  className="flex-1"
                                >
                                  ✕
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 