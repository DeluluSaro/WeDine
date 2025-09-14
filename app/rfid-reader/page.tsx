'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Wifi, WifiOff, CheckCircle, XCircle } from 'lucide-react';

interface RFIDData {
  cardId: string;
  timestamp: string;
  deviceId?: string;
  userEmail?: string;
  studentName?: string;
  isVerified?: boolean;
}

interface ShopRFIDData {
  [cardId: string]: RFIDData;
}

export default function RFIDReaderPage() {
  const [selectedShop, setSelectedShop] = useState<string>('');
  const [rfidData, setRfidData] = useState<ShopRFIDData>({});
  const [shops, setShops] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Fetch available shops
  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const response = await fetch('/api/shops');
      if (response.ok) {
        const data = await response.json();
        setShops(data.shops || []);
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
    }
  };

  // No automatic polling - manual scanning only
  useEffect(() => {
    if (!selectedShop) return;
    
    // Clear data when shop changes
    setRfidData({});
    setError('');
  }, [selectedShop]);

  const fetchRFIDData = async (shopName: string) => {
    try {
      const response = await fetch(`/api/rfid/data?shopName=${encodeURIComponent(shopName)}`);
      if (response.ok) {
        const data = await response.json();
        setRfidData(data.rfidData || {});
        setIsConnected(true);
        setError('');
      } else {
        setError('Failed to fetch RFID data');
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error fetching RFID data:', error);
      setError('Connection error');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    if (selectedShop) {
      fetchRFIDData(selectedShop);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (isVerified?: boolean) => {
    if (isVerified === true) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
    } else if (isVerified === false) {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Unverified</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">RFID Reader Dashboard</h1>
        <p className="text-gray-600">Monitor RFID card captures - click "Scan RFID" to check for latest cards</p>
      </div>

      {/* Connection Status */}
      <div className="mb-6">
        <Alert className={isConnected ? 'border-green-500' : 'border-red-500'}>
          <div className="flex items-center">
            {isConnected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
            <AlertDescription className="ml-2">
              {isConnected ? 'Connected to Firebase' : 'Disconnected from Firebase'}
            </AlertDescription>
          </div>
        </Alert>
      </div>

      {/* Shop Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Shop</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="shop-select">Choose a shop to monitor</Label>
              <Select value={selectedShop} onValueChange={setSelectedShop}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a shop" />
                </SelectTrigger>
                <SelectContent>
                  {shops.map((shop) => (
                    <SelectItem key={shop} value={shop}>
                      {shop}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleRefresh} 
              disabled={!selectedShop || isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Scanning...' : 'Scan RFID'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* RFID Data Display */}
      {selectedShop && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>RFID Data for {selectedShop}</span>
              <Badge variant="outline">
                {Object.keys(rfidData).length} cards detected
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4 border-red-500">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {Object.keys(rfidData).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No RFID cards detected yet. Click "Scan RFID" to check for latest cards.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(rfidData).map(([cardId, data]) => (
                  <Card key={cardId} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Card ID</Label>
                          <p className="font-mono text-lg">{cardId}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Student Name</Label>
                          <p className="text-lg">{data.studentName || 'Unknown'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Email</Label>
                          <p className="text-lg">{data.userEmail || 'Not provided'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Status</Label>
                          <div className="mt-1">
                            {getStatusBadge(data.isVerified)}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Timestamp</Label>
                          <p className="text-sm">{formatTimestamp(data.timestamp)}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Device ID</Label>
                          <p className="text-sm">{data.deviceId || 'Unknown'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
