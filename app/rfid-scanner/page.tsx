'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface RFIDData {
  cardId: string;
  deviceId: string;
  isVerified: boolean;
  shopName: string;
  studentName: string;
  timestamp: string;
  userEmail: string;
}

export default function RFIDScannerPage() {
  const [rfidData, setRfidData] = useState<RFIDData | null>(null);
  const [shopName, setShopName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // const [isListening, setIsListening] = useState(false); // Removed auto-refresh
  const [copied, setCopied] = useState(false);

  // Fetch latest RFID data
  const fetchLatestRFID = async () => {
    if (!shopName) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/rfid/data?shopName=${encodeURIComponent(shopName)}`);
      const data = await response.json();
      
      if (data.success && data.rfidData) {
        setRfidData(data.rfidData);
        setLastUpdated(new Date());
        setSuccess('RFID data updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('No RFID data found for this shop');
        setRfidData(null);
      }
    } catch (err) {
      setError('Failed to fetch RFID data');
      console.error('Error fetching RFID data:', err);
    } finally {
      setLoading(false);
    }
  };

  // No automatic refreshing - manual scanning only

  // Copy card ID to clipboard
  const copyCardId = async () => {
    if (rfidData?.cardId) {
      try {
        await navigator.clipboard.writeText(rfidData.cardId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(parseInt(timestamp));
      return date.toLocaleString();
    } catch {
      return 'Invalid timestamp';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">RFID Card Scanner</h1>
        <p className="text-gray-600">
          Scan your RFID card and copy the card number to register in your wallet
        </p>
      </div>

      {/* Shop Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Shop</CardTitle>
          <CardDescription>Choose the shop where you want to scan your RFID card</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <Input
              placeholder="Enter shop name (e.g., Guvi)"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={fetchLatestRFID} 
              disabled={!shopName || loading}
              className="min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Scan RFID
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* RFID Data Display */}
      {rfidData && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              RFID Card Detected
            </CardTitle>
            <CardDescription>
              Card scanned at {formatTimestamp(rfidData.timestamp)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Card ID - Main Display */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Your RFID Card Number:
                </label>
                <div className="flex gap-2">
                  <Input
                    value={rfidData.cardId}
                    readOnly
                    className="text-lg font-mono bg-gray-50 border-2 border-blue-200"
                  />
                  <Button
                    onClick={copyCardId}
                    variant="outline"
                    className="px-4"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Copy this number and paste it in your wallet registration
                </p>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Shop Name:</label>
                  <p className="text-sm text-gray-900">{rfidData.shopName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Device ID:</label>
                  <p className="text-sm text-gray-900">{rfidData.deviceId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status:</label>
                  <Badge variant={rfidData.isVerified ? "default" : "secondary"}>
                    {rfidData.isVerified ? "Verified" : "Not Verified"}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Updated:</label>
                  <p className="text-sm text-gray-900">
                    {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">1.</span>
              <span>Enter the shop name where you want to scan your card</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">2.</span>
              <span>Place your RFID card on the reader</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">3.</span>
              <span>Click "Scan RFID" button to check for your card</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">4.</span>
              <span>Your card number will appear in the text box above</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">5.</span>
              <span>Click "Copy" to copy the card number</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">6.</span>
              <span>Go to your wallet and paste the card number to register</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Messages */}
      {error && (
        <Alert className="mt-4" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mt-4" variant="default">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
