'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CreditCard, Wifi } from 'lucide-react';

export default function TestRFIDPage() {
  const [shopName, setShopName] = useState('Test Shop');
  const [cardId, setCardId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSimulateScan = async () => {
    if (!cardId.trim()) {
      toast.error('Please enter a card ID');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/rfid/capture-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopName: shopName,
          cardId: cardId.trim(),
          deviceId: 'TEST_DEVICE',
          studentName: studentName.trim() || 'Test Student',
          userEmail: userEmail.trim() || 'test@example.com'
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`RFID card sent to ${shopName} successfully!`);
        setCardId('');
        setStudentName('');
        setUserEmail('');
      } else {
        toast.error(result.message || 'Failed to simulate RFID scan');
      }
    } catch (error) {
      console.error('Error simulating RFID scan:', error);
      toast.error('Failed to simulate RFID scan');
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomCardId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCardId(result);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Test RFID Scanner</h1>
        <p className="text-gray-600">Simulate RFID card scanning for testing</p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Simulate RFID Card Scan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="shop-name">Shop Name</Label>
            <Input
              id="shop-name"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Enter shop name"
            />
          </div>

          <div>
            <Label htmlFor="card-id">RFID Card ID</Label>
            <div className="flex gap-2">
              <Input
                id="card-id"
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                placeholder="Enter or generate card ID"
                className="font-mono"
              />
              <Button
                onClick={generateRandomCardId}
                variant="outline"
                className="whitespace-nowrap"
              >
                Generate
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="student-name">Student Name (Optional)</Label>
            <Input
              id="student-name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Enter student name"
            />
          </div>

          <div>
            <Label htmlFor="user-email">User Email (Optional)</Label>
            <Input
              id="user-email"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="Enter user email"
            />
          </div>

          <Button
            onClick={handleSimulateScan}
            disabled={isLoading || !cardId.trim()}
            className="w-full"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Simulating Scan...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                Simulate RFID Scan
              </div>
            )}
          </Button>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Instructions:</h4>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Enter a shop name (or use default "Test Shop")</li>
              <li>Enter or generate a card ID</li>
              <li>Optionally enter student name and email</li>
              <li>Click "Simulate RFID Scan" to store the data in Firebase</li>
              <li>Go to <a href="/rfid-finder" className="underline">RFID Finder</a> to see the captured card</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
