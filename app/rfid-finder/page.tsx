'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Wifi, WifiOff, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface RFIDData {
  cardId: string;
  shopName: string;
  timestamp: string;
}

export default function RFIDFinderPage() {
  const [selectedShop, setSelectedShop] = useState<string>('');
  const [latestRfidCard, setLatestRfidCard] = useState<RFIDData | null>(null);
  const [shops, setShops] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Fetch available shops
  useEffect(() => {
    fetchShops();
    
    // Check for shop parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const shopParam = urlParams.get('shop');
    if (shopParam) {
      setSelectedShop(shopParam);
    }
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

  // No automatic fetching - only manual scanning
  useEffect(() => {
    if (!selectedShop) return;
    
    // Clear any existing data when shop changes
    setLatestRfidCard(null);
    setError('');
  }, [selectedShop]);

  const fetchLatestRFIDCard = async (shopName: string) => {
    try {
      const response = await fetch(`/api/rfid/data?shopName=${encodeURIComponent(shopName)}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Use the latestScan directly from the API (most recent card)
        if (data.latestScan) {
          setLatestRfidCard(data.latestScan);
        } else {
          setLatestRfidCard(null);
        }
        
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
      fetchLatestRFIDCard(selectedShop);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('RFID Card ID copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">RFID Card Finder</h1>
        <p className="text-gray-600">
          {selectedShop 
            ? `Viewing RFID data for ${selectedShop}`
            : 'Find your RFID card number from the latest scan'
          }
        </p>
        {selectedShop && (
          <p className="text-sm text-blue-600 mt-2">
            🔒 Shop-specific view - Only showing data for {selectedShop}
          </p>
        )}
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
          <CardTitle>
            Select Shop
            {selectedShop && (
              <span className="text-sm font-normal text-blue-600 ml-2">
                🔒 Pre-selected from admin panel
              </span>
            )}
          </CardTitle>
          </CardHeader>
          <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="shop-select">
                {selectedShop ? 'Shop (locked)' : 'Choose a shop to monitor'}
              </Label>
              <Select 
                value={selectedShop} 
                onValueChange={setSelectedShop}
                disabled={!!selectedShop}
              >
                <SelectTrigger className={selectedShop ? 'bg-blue-50 border-blue-200' : ''}>
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
              {selectedShop && (
                <p className="text-xs text-blue-600 mt-1">
                  Shop is locked to {selectedShop} - opened from admin panel
                </p>
              )}
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

      {/* Latest RFID Card Display */}
      {selectedShop && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Latest RFID Card - {selectedShop}</span>
              {latestRfidCard && (
                      <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600">Live</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4 border-red-500">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!latestRfidCard ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wifi className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No RFID Card Detected</h3>
                <p className="text-gray-500">
                  {isLoading ? 'Scanning for RFID cards...' : 'Click "Scan RFID" button to check for latest card'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Main RFID Card Display */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
                    <div className="text-center">
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">RFID Card Detected!</h3>
                    <p className="text-gray-600 mb-4">Copy this number to your wallet for registration</p>
                    
                    {/* RFID Card ID Display */}
                    <div className="bg-white border-2 border-blue-300 rounded-lg p-4 mb-4">
                      <Label className="text-sm font-medium text-gray-500 mb-2 block">Your RFID Card ID:</Label>
                      <div className="flex items-center justify-center gap-3">
                        <code className="text-2xl font-mono font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded border">
                          {latestRfidCard.cardId}
                        </code>
                        <Button
                          onClick={() => copyToClipboard(latestRfidCard.cardId)}
                          size="sm"
                          className={`${copied ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                        >
                          {copied ? <CheckCircle className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                          {copied ? 'Copied!' : 'Copy'}
                        </Button>
                    </div>
                  </div>

                    {/* Additional Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Shop:</span> {latestRfidCard.shopName}
                      </div>
                      <div>
                        <span className="font-medium">Scanned At:</span> {formatTimestamp(latestRfidCard.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">Next Steps:</h4>
                  <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                    <li>Copy the RFID Card ID above</li>
                    <li>Go to your wallet page</li>
                    <li>Click "Setup RFID Card"</li>
                    <li>Paste the RFID Card ID</li>
                    <li>Click "Register RFID Card" to enable payments</li>
                  </ol>
                </div>
              </div>
            )}
            </CardContent>
          </Card>
        )}
    </div>
  );
}