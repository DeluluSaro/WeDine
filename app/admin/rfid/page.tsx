'use client';

import { useState, useEffect } from 'react';
import { client } from '@/sanity/lib/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Search, RefreshCw, CreditCard, User, Mail, Calendar } from 'lucide-react';

interface RFIDCard {
  _id: string;
  cardId: string;
  userEmail: string;
  studentName: string;
  studentId: string;
  collegeName: string;
  cardType: 'student' | 'faculty' | 'staff' | 'guest';
  isActive: boolean;
  isBlocked: boolean;
  registeredAt: string;
  lastUsedAt?: string;
  registeredBy: string;
  notes?: string;
}

export default function RFIDManagementPage() {
  const [cards, setCards] = useState<RFIDCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [selectedCard, setSelectedCard] = useState<RFIDCard | null>(null);

  // Form state for registering new card
  const [formData, setFormData] = useState({
    cardId: '',
    userEmail: '',
    studentName: '',
    studentId: '',
    collegeName: '',
    cardType: 'student' as const,
    notes: ''
  });

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const query = `
        *[_type == "rfidCard"] | order(registeredAt desc) {
          _id,
          cardId,
          userEmail,
          studentName,
          studentId,
          collegeName,
          cardType,
          isActive,
          isBlocked,
          registeredAt,
          lastUsedAt,
          registeredBy,
          notes
        }
      `;
      const result = await client.fetch(query);
      setCards(result);
    } catch (error) {
      console.error('Error fetching RFID cards:', error);
      toast.error('Failed to fetch RFID cards');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterCard = async () => {
    if (!formData.cardId || !formData.userEmail) {
      toast.error('Card ID and email are required');
      return;
    }

    try {
      const response = await fetch('/api/payment/rfid/improved', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          adminKey: process.env.NEXT_PUBLIC_ADMIN_RFID_KEY || 'admin_key'
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('RFID card registered successfully');
        setShowRegisterDialog(false);
        setFormData({
          cardId: '',
          userEmail: '',
          studentName: '',
          studentId: '',
          collegeName: '',
          cardType: 'student',
          notes: ''
        });
        fetchCards();
      } else {
        toast.error(result.message || 'Failed to register card');
      }
    } catch (error) {
      console.error('Error registering card:', error);
      toast.error('Failed to register RFID card');
    }
  };

  const toggleCardStatus = async (cardId: string, isActive: boolean) => {
    try {
      await client
        .patch(cardId)
        .set({ isActive: !isActive })
        .commit();

      toast.success(`Card ${!isActive ? 'activated' : 'deactivated'} successfully`);
      fetchCards();
    } catch (error) {
      console.error('Error updating card status:', error);
      toast.error('Failed to update card status');
    }
  };

  const toggleCardBlock = async (cardId: string, isBlocked: boolean) => {
    try {
      await client
        .patch(cardId)
        .set({ isBlocked: !isBlocked })
        .commit();

      toast.success(`Card ${!isBlocked ? 'blocked' : 'unblocked'} successfully`);
      fetchCards();
    } catch (error) {
      console.error('Error updating card block status:', error);
      toast.error('Failed to update card block status');
    }
  };

  const filteredCards = cards.filter(card => {
    const matchesSearch = 
      card.cardId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || card.cardType === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const getCardTypeColor = (cardType: string) => {
    switch (cardType) {
      case 'student': return 'bg-blue-100 text-blue-800';
      case 'faculty': return 'bg-green-100 text-green-800';
      case 'staff': return 'bg-purple-100 text-purple-800';
      case 'guest': return 'bg-gray-100 text-gray-800';
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading RFID cards...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            RFID Card Management
          </h1>
          <p className="text-gray-600">Manage student RFID cards for payment system</p>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm font-medium">Search Cards</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="search"
                placeholder="Card ID, Email, Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="filter" className="text-sm font-medium">Filter by Type</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger id="filter">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="faculty">Faculty</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Actions</Label>
            <div className="flex gap-2">
              <Button
                onClick={fetchCards}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Register Card
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Register New RFID Card</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="cardId">Card ID *</Label>
                      <Input
                        id="cardId"
                        placeholder="Enter RFID card serial number"
                        value={formData.cardId}
                        onChange={(e) => setFormData({...formData, cardId: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="userEmail">Email *</Label>
                      <Input
                        id="userEmail"
                        type="email"
                        placeholder="student@college.edu"
                        value={formData.userEmail}
                        onChange={(e) => setFormData({...formData, userEmail: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="studentName">Student Name</Label>
                      <Input
                        id="studentName"
                        placeholder="Full name"
                        value={formData.studentName}
                        onChange={(e) => setFormData({...formData, studentName: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="studentId">Student ID</Label>
                      <Input
                        id="studentId"
                        placeholder="Student ID number"
                        value={formData.studentId}
                        onChange={(e) => setFormData({...formData, studentId: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="collegeName">College Name</Label>
                      <Input
                        id="collegeName"
                        placeholder="College/University name"
                        value={formData.collegeName}
                        onChange={(e) => setFormData({...formData, collegeName: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cardType">Card Type</Label>
                      <Select value={formData.cardType} onValueChange={(value: any) => setFormData({...formData, cardType: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="faculty">Faculty</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="guest">Guest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Input
                        id="notes"
                        placeholder="Additional notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleRegisterCard} className="flex-1">
                        Register Card
                      </Button>
                      <Button variant="outline" onClick={() => setShowRegisterDialog(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900">{cards.length}</div>
              <div className="text-sm text-gray-600">Total Cards</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {cards.filter(card => card.isActive && !card.isBlocked).length}
              </div>
              <div className="text-sm text-gray-600">Active Cards</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {cards.filter(card => card.isBlocked).length}
              </div>
              <div className="text-sm text-gray-600">Blocked Cards</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {cards.filter(card => card.cardType === 'student').length}
              </div>
              <div className="text-sm text-gray-600">Student Cards</div>
            </CardContent>
          </Card>
        </div>

        {/* Cards Table */}
        <Card>
          <CardHeader>
            <CardTitle>RFID Cards ({filteredCards.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Card Details</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Info</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Used</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCards.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <CreditCard className="h-12 w-12 text-gray-400 mb-4" />
                          <div className="text-gray-500 text-lg font-medium mb-1">No RFID cards found</div>
                          <div className="text-gray-400 text-sm">Try adjusting your search or filters</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCards.map((card) => (
                      <tr key={card._id} className="hover:bg-gray-50">
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{card.cardId}</div>
                            <div className="text-sm text-gray-500">{card.userEmail}</div>
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{card.studentName || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{card.studentId || 'N/A'}</div>
                            <div className="text-xs text-gray-400">{card.collegeName || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className={getCardTypeColor(card.cardType)}>
                              {card.cardType}
                            </Badge>
                            <Badge variant={card.isActive ? 'default' : 'secondary'}>
                              {card.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            {card.isBlocked && (
                              <Badge variant="destructive">Blocked</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {card.lastUsedAt ? formatDate(card.lastUsedAt) : 'Never'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleCardStatus(card._id, card.isActive)}
                            >
                              {card.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              size="sm"
                              variant={card.isBlocked ? "default" : "destructive"}
                              onClick={() => toggleCardBlock(card._id, card.isBlocked)}
                            >
                              {card.isBlocked ? 'Unblock' : 'Block'}
                            </Button>
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
    </div>
  );
}
