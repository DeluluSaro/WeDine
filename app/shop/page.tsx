'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CreditCard, Wifi, RefreshCw, DollarSign, AlertCircle } from 'lucide-react';

interface Payment {
  _id: string;
  orderId: string;
  amount: number;
  razorpayOrderId: string;
  status: 'created' | 'paid' | 'failed';
  createdAt: string;
  paidAt?: string;
}

export default function ShopPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceStatus, setDeviceStatus] = useState<'online' | 'offline'>('offline');

  useEffect(() => {
    fetchPayments();
    checkDeviceStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchPayments();
      checkDeviceStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/shop/payments?shopId=SHOP_001');
      const data = await response.json();
      setPayments(data.payments || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const checkDeviceStatus = async () => {
    try {
      const response = await fetch('/api/rfid/device-status?deviceId=SHOP_001');
      const data = await response.json();
      setDeviceStatus(data.isOnline ? 'online' : 'offline');
    } catch (error) {
      setDeviceStatus('offline');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'created': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  const totalEarnings = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingPayments = payments.filter(p => p.status === 'created').length;
  const completedPayments = payments.filter(p => p.status === 'paid').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Shop Payment Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              deviceStatus === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <Wifi className="h-4 w-4" />
              <span className="text-sm font-medium">
                RFID Device: {deviceStatus === 'online' ? 'Online' : 'Offline'}
              </span>
            </div>
            <Button
              onClick={checkDeviceStatus}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">₹{totalEarnings}</div>
                  <div className="text-sm text-gray-600">Total Earnings</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{pendingPayments}</div>
                  <div className="text-sm text-gray-600">Pending Payments</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Wifi className={`h-5 w-5 ${deviceStatus === 'online' ? 'text-green-600' : 'text-red-600'}`} />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{completedPayments}</div>
                  <div className="text-sm text-gray-600">Completed Payments</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Device Status Alert */}
        {deviceStatus === 'offline' && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-800">RFID Device Offline</h3>
                  <p className="text-sm text-red-700">
                    Your RFID payment device is currently offline. Check the device connection and WiFi.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Payment History</span>
              <Button onClick={fetchPayments} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <CreditCard className="h-12 w-12 text-gray-400 mb-4" />
                          <div className="text-gray-500 text-lg font-medium mb-1">No payments found</div>
                          <div className="text-gray-400 text-sm">Payments will appear here when created</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment) => (
                      <tr key={payment._id} className="hover:bg-gray-50">
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {payment.orderId}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{payment.amount}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          <Badge className={getStatusColor(payment.status)}>
                            {payment.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(payment.createdAt)}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.status === 'created' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                // Open Razorpay payment
                                window.open(`/payment/razorpay/${payment.razorpayOrderId}`, '_blank');
                              }}
                            >
                              Pay Now
                            </Button>
                          )}
                          {payment.status === 'paid' && (
                            <span className="text-green-600 text-sm">✓ Paid</span>
                          )}
                          {payment.status === 'failed' && (
                            <span className="text-red-600 text-sm">✗ Failed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>How to Use RFID Payment System</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">1. RFID Payment (Automatic)</h4>
                  <p className="text-sm text-gray-600">
                    Students tap their college ID card on the RFID device for instant payment from their wallet.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">2. Razorpay Payment (Fallback)</h4>
                  <p className="text-sm text-gray-600">
                    If RFID fails, create a Razorpay payment link for students to pay online.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">3. Monitor Payments</h4>
                  <p className="text-sm text-gray-600">
                    Track all payments, earnings, and device status in real-time on this dashboard.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">4. Device Management</h4>
                  <p className="text-sm text-gray-600">
                    Ensure your RFID device is online and connected to WiFi for seamless payments.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
