"use client";
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { FloatingNav } from '@/components/ui/floating-navbar';
import { HomeIcon, BookOpen, History, Wallet, MailIcon, CreditCard, Plus, Minus, ArrowUp, ArrowDown, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface WalletData {
  balance: number;
  transactions: Array<{
    type: 'add' | 'payment' | 'refund';
    amount: number;
    description: string;
    orderId?: string;
    paymentId?: string;
    timestamp: string;
  }>;
}

const WalletPage = () => {
  const { user } = useUser();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingMoney, setAddingMoney] = useState(false);
  const [amount, setAmount] = useState<number>(100);
  const [showAddMoney, setShowAddMoney] = useState(false);

  const navItems = [
    { name: "Home", link: "/", icon: <HomeIcon /> },
    { name: "Book", link: "/book", icon: <BookOpen /> },
    { name: "History", link: "/orders", icon: <History /> },
    { name: "Wallet", link: "/wallet", icon: <Wallet /> },
    { name: "Contact", link: "/contact", icon: <MailIcon /> },
  ];

  useEffect(() => {
    if (user) {
      fetchWalletData();
      checkPendingPayments();
    }
  }, [user]);

  const checkPendingPayments = async () => {
    // Check for any pending payments that might have been completed
    // This handles cases where user closed browser during payment
    try {
      const pendingOrderId = localStorage.getItem('pendingPaymentOrderId');
      if (pendingOrderId && user?.emailAddresses?.[0]?.emailAddress) {
        const response = await fetch(
          `/api/wallet/payment-status?orderId=${pendingOrderId}&userEmail=${encodeURIComponent(user.emailAddresses[0].emailAddress)}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.paymentCompleted) {
            toast.success(`Payment of ₹${data.amount} completed successfully!`);
            localStorage.removeItem('pendingPaymentOrderId');
            fetchWalletData(); // Refresh wallet data
          }
        }
      }
    } catch (error) {
      console.error('Error checking pending payments:', error);
    }
  };

  const fetchWalletData = async () => {
    if (!user?.emailAddresses?.[0]?.emailAddress) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/wallet/balance?email=${encodeURIComponent(user.emailAddresses[0].emailAddress)}`);
      if (response.ok) {
        const data = await response.json();
        setWalletData(data);
      } else {
        // Create wallet if doesn't exist
        await createWallet();
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const createWallet = async () => {
    if (!user?.emailAddresses?.[0]?.emailAddress) return;
    
    try {
      const response = await fetch('/api/wallet/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user.emailAddresses[0].emailAddress,
          balance: 0
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setWalletData(data);
        toast.success('Wallet created successfully!');
      }
    } catch (error) {
      console.error('Error creating wallet:', error);
      toast.error('Failed to create wallet');
    }
  };

  const createTestWallet = async () => {
    if (!user?.emailAddresses?.[0]?.emailAddress) return;
    
    try {
      const response = await fetch('/api/wallet/test-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user.emailAddresses[0].emailAddress,
          testBalance: 1000
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setWalletData(data);
        toast.success('Test wallet created with ₹1000!');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to create test wallet');
      }
    } catch (error) {
      console.error('Error creating test wallet:', error);
      toast.error('Failed to create test wallet');
    }
  };

  const handleAddMoney = async () => {
    if (!user?.emailAddresses?.[0]?.emailAddress || amount < 10) {
      toast.error('Minimum amount is ₹10');
      return;
    }

    if (amount > 10000) {
      toast.error('Maximum amount is ₹10,000 per transaction');
      return;
    }

    setAddingMoney(true);
    try {
      const response = await fetch('/api/wallet/add-money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user.emailAddresses[0].emailAddress,
          amount: amount,
          userId: user.id
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Store order ID for status checking
        localStorage.setItem('pendingPaymentOrderId', data.orderId);
        
        // Initialize Razorpay with enhanced options
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: amount * 100, // Razorpay expects amount in paise
          currency: 'INR',
          name: 'WeDine Wallet',
          description: `Add ₹${amount} to WeDine wallet`,
          order_id: data.orderId,
          handler: async (response: any) => {
            try {
              toast.loading('Verifying payment...', { id: 'payment-verification' });
              
              const verifyResponse = await fetch('/api/wallet/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                  signature: response.razorpay_signature,
                  userEmail: user.emailAddresses[0].emailAddress,
                  amount: amount
                })
              });

              const verifyData = await verifyResponse.json();
              if (verifyData.success) {
                toast.success(`₹${amount} added to wallet successfully!`, { id: 'payment-verification' });
                localStorage.removeItem('pendingPaymentOrderId'); // Clear stored order ID
                setShowAddMoney(false);
                setAmount(100); // Reset amount
                fetchWalletData(); // Refresh wallet data
              } else {
                toast.error(verifyData.message || 'Payment verification failed', { id: 'payment-verification' });
              }
            } catch (error) {
              console.error('Payment verification error:', error);
              toast.error('Payment verification failed. Please contact support.', { id: 'payment-verification' });
            }
          },
          prefill: {
            name: user.fullName || '',
            email: user.emailAddresses[0].emailAddress,
            contact: user.phoneNumbers?.[0]?.phoneNumber || ''
          },
          theme: {
            color: '#FFD600',
            backdrop_color: '#00000080'
          },
          modal: {
            ondismiss: () => {
              toast.dismiss('payment-verification');
              localStorage.removeItem('pendingPaymentOrderId'); // Clear stored order ID
              setAddingMoney(false);
            }
          },
          retry: {
            enabled: true,
            max_count: 3
          },
          timeout: 300, // 5 minutes
          notes: {
            source: 'WeDine Wallet',
            purpose: 'wallet_topup'
          }
        };

        // Check if Razorpay is loaded
        if (typeof window !== 'undefined' && (window as any).Razorpay) {
          const razorpay = new (window as any).Razorpay(options);
          razorpay.open();
        } else {
          toast.error('Payment gateway not loaded. Please refresh the page.');
          setAddingMoney(false);
        }
      } else {
        toast.error(data.message || 'Failed to create payment order');
        setAddingMoney(false);
      }
    } catch (error) {
      console.error('Error adding money:', error);
      toast.error('Failed to add money to wallet. Please try again.');
      setAddingMoney(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'add':
        return <ArrowUp className="w-4 h-4 text-green-600" />;
      case 'payment':
        return <ArrowDown className="w-4 h-4 text-red-600" />;
      case 'refund':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'add':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'payment':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'refund':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-200 via-yellow-100 to-beige-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-yellow-800 font-semibold">Loading wallet...</p>
        </div>
      </div>
    );
  }

  // Show create wallet option if no wallet exists
  if (!walletData) {
  return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-200 via-yellow-100 to-beige-100">
        <FloatingNav navItems={navItems} showBadges={true} eWalletAmount={0} />
        
        <div className="pt-24 px-4 sm:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-yellow-800">Create Your Wallet</h1>
              </div>
              <p className="text-yellow-700 text-lg">Set up your digital wallet to start making payments</p>
            </div>

            <div className="bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-lg rounded-3xl p-8 border border-yellow-200/50 shadow-xl text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Wallet className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome to WeDine Wallet!</h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Create your digital wallet to add money and make secure payments using UPI, cards, or RFID.
              </p>
              
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={createWallet}
                  className="bg-gradient-to-r from-green-400 to-green-500 text-white font-bold py-3 px-8 rounded-full hover:from-green-500 hover:to-green-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Wallet className="w-5 h-5 mr-2" />
                  Create Wallet
                </Button>
                
                {/* Test Mode Button - Only show in development */}
                {process.env.NODE_ENV === 'development' && (
                  <Button
                    onClick={createTestWallet}
                    className="bg-gradient-to-r from-blue-400 to-blue-500 text-white font-bold py-3 px-6 rounded-full hover:from-blue-500 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <Wallet className="w-5 h-5 mr-2" />
                    Test Setup (₹1000)
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
    </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-200 via-yellow-100 to-beige-100">
      <FloatingNav navItems={navItems} showBadges={true} eWalletAmount={walletData?.balance || 0} />
      
      <div className="pt-24 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-yellow-800">My Wallet</h1>
            </div>
            <p className="text-yellow-700 text-lg">Manage your digital wallet and view transaction history</p>
          </div>

          {/* Wallet Balance Card */}
          <div className="bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-lg rounded-3xl p-8 mb-8 border border-yellow-200/50 shadow-xl">
            <div className="text-center">
              <div className="text-6xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent mb-2">
                ₹{walletData?.balance || 0}
              </div>
              <p className="text-yellow-700 text-lg font-medium mb-6">Current Balance</p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => setShowAddMoney(true)}
                  className="bg-gradient-to-r from-green-400 to-green-500 text-white font-bold py-3 px-8 rounded-full hover:from-green-500 hover:to-green-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Money
                </Button>
                
                {/* Test Mode Button - Only show in development */}
                {process.env.NODE_ENV === 'development' && (
                  <Button
                    onClick={createTestWallet}
                    className="bg-gradient-to-r from-blue-400 to-blue-500 text-white font-bold py-3 px-6 rounded-full hover:from-blue-500 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <Wallet className="w-5 h-5 mr-2" />
                    Test Setup (₹1000)
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Add Money Modal */}
          {showAddMoney && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Add Money to Wallet</h3>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
                  
                  {/* Quick Amount Buttons */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[100, 200, 500, 1000, 2000, 5000].map((quickAmount) => (
                      <button
                        key={quickAmount}
                        onClick={() => setAmount(quickAmount)}
                        className={`p-3 rounded-lg font-semibold transition-all duration-200 ${
                          amount === quickAmount
                            ? 'bg-yellow-500 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-yellow-100'
                        }`}
                      >
                        ₹{quickAmount}
                      </button>
                    ))}
                  </div>

                  {/* Manual Amount Input */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(Math.max(10, amount - 50))}
                      disabled={amount <= 10}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Math.max(10, parseInt(e.target.value) || 10))}
                      className="flex-1 text-center text-2xl font-bold border-2 border-yellow-300 rounded-lg p-3 focus:outline-none focus:border-yellow-500"
                      min="10"
                      max="10000"
                      step="10"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(Math.min(10000, amount + 50))}
                      disabled={amount >= 10000}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500 mt-2">
                    <span>Min: ₹10</span>
                    <span>Max: ₹10,000</span>
                  </div>
                </div>

                {/* Payment Methods Info */}
                <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Payment Methods
                  </h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>• UPI (Google Pay, PhonePe, Paytm, BHIM)</p>
                    <p>• Credit/Debit Cards</p>
                    <p>• Net Banking</p>
                    <p>• Wallets (Paytm, Mobikwik)</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddMoney(false)}
                    className="flex-1"
                    disabled={addingMoney}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddMoney}
                    disabled={addingMoney}
                    className="flex-1 bg-gradient-to-r from-green-400 to-green-500 text-white font-bold hover:from-green-500 hover:to-green-600 disabled:opacity-50"
                  >
                    {addingMoney ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Processing...
                      </div>
                    ) : (
                      `Pay ₹${amount}`
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Transaction History */}
          <div className="bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-lg rounded-3xl p-8 border border-yellow-200/50 shadow-xl">
            <h2 className="text-2xl font-bold text-yellow-800 mb-6 flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Transaction History
            </h2>
            
            {walletData?.transactions && walletData.transactions.length > 0 ? (
              <div className="space-y-4">
                {walletData.transactions
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((transaction, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 ${getTransactionColor(transaction.type)}`}
                    >
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <p className="font-semibold">{transaction.description}</p>
                          <p className="text-sm opacity-75">{formatDate(transaction.timestamp)}</p>
                          {transaction.orderId && (
                            <p className="text-xs opacity-60">Order: {transaction.orderId}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-lg ${
                          transaction.type === 'add' || transaction.type === 'refund' 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {transaction.type === 'add' || transaction.type === 'refund' ? '+' : '-'}₹{transaction.amount}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No transactions yet</p>
                <p className="text-gray-500">Your transaction history will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;