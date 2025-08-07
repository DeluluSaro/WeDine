"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Minus, Trash2, CreditCard, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { CartItem } from './CartContext';
import Image from 'next/image';
import { calculateTotalAmount } from '@/lib/razorpay';
import { toast } from 'sonner';
import { useCart } from './CartContext';

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  image: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  notes: {
    orderType: string;
    platform: string;
  };
  theme: {
    color: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal: {
    ondismiss: () => void;
  };
}

interface WindowWithRazorpay extends Window {
  Razorpay: new (options: RazorpayOptions) => {
    open: () => void;
  };
}

// Utility function to load Razorpay script
const loadRazorpayScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as unknown as WindowWithRazorpay).Razorpay) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay script'));
    document.head.appendChild(script);
  });
};

interface BuyNowPopupProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onPlaceOrder: (paymentMethod: 'cod' | 'online') => Promise<void>;
  isLoading?: boolean;
  userDetails?: {
    id: string;
    email?: string;
    name?: string;
    phone?: string;
  };
}

const BuyNowPopup: React.FC<BuyNowPopupProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onPlaceOrder,
  isLoading = false,
  userDetails
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [localCartItems, setLocalCartItems] = useState<CartItem[]>(cartItems);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [isProcessingCOD, setIsProcessingCOD] = useState(false);
  
  // Order processing states
  const [isOrderProcessing, setIsOrderProcessing] = useState(false);
  const [orderProcessingType, setOrderProcessingType] = useState<'cod' | 'online' | null>(null);
  const { clearCart } = useCart();

  // Update local cart items when prop changes
  useEffect(() => {
    setLocalCartItems(cartItems);
  }, [cartItems]);

  // Calculate totals
  const subtotal = localCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const { tax, deliveryFee, total } = calculateTotalAmount(subtotal);

  const handleQuantityChange = (id: string, change: number) => {
    const updatedItems = localCartItems.map(item => {
      if (item._id === id) {
        const newQuantity = Math.max(1, item.quantity + change);
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    setLocalCartItems(updatedItems);
    onUpdateQuantity(id, updatedItems.find(item => item._id === id)?.quantity || 1);
  };

  const handleRemoveItem = (id: string) => {
    setLocalCartItems(prev => prev.filter(item => item._id !== id));
    onRemoveItem(id);
  };

  const handlePlaceOrder = async () => {
    // Prevent multiple order submissions with enhanced protection
    if (isOrderProcessing || isProcessingCOD) {
      console.log('Order already being processed');
      toast.error('Order already being processed. Please wait...');
      return;
    }

    // Additional protection: disable button for 2 seconds after any order attempt
    const button = document.querySelector('[data-order-button]') as HTMLButtonElement;
    if (button) {
      button.disabled = true;
      setTimeout(() => {
        if (button) button.disabled = false;
      }, 2000);
    }

    if (!userDetails?.id) {
      setPaymentError('User not authenticated');
      return;
    }

    // Set processing state immediately
    setIsOrderProcessing(true);
    setOrderProcessingType(paymentMethod);
    setPaymentError(null);
    setPaymentSuccess(null);

    try {
      if (paymentMethod === 'online') {
        await handleOnlinePayment();
      } else {
        await handleCODOrder();
      }
    } catch (error) {
      console.error('Order processing error:', error);
      setPaymentError(error instanceof Error ? error.message : 'Payment failed');
      // Reset processing state on error
      setIsOrderProcessing(false);
      setOrderProcessingType(null);
    }
  };

  const handleOnlinePayment = async () => {
    if (!userDetails) return;

    setIsProcessingCOD(true);
    setPaymentError(null);
    setPaymentSuccess(null);

    try {
      console.log('🔍 Debug: Starting online payment process...');
      
      // Create order only once
      const orderResponse = await fetch('/api/orders/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems: localCartItems,
          paymentMethod: 'online',
          userDetails: {
            userId: userDetails.id,
            email: userDetails.email || '',
            name: userDetails.name || '',
            phone: userDetails.phone || ''
          }
        })
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        
        // Handle duplicate order errors specifically
        if (orderResponse.status === 409) {
          console.warn('Duplicate order detected:', errorData);
          toast.error('Order already exists. Please check your orders.');
          // Reset processing state
          setIsOrderProcessing(false);
          setOrderProcessingType(null);
          return;
        }
        
        throw new Error(errorData.error || 'Failed to create order');
      }

      const orderData = await orderResponse.json();
      console.log('🔍 Debug: Order created successfully:', orderData);

      // Store order ID for payment verification
      const orderDbId = orderData.orderDbId;
      const razorpayOrderId = orderData.orderId;

      // Check if Razorpay is available
      if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
        throw new Error('Razorpay configuration is missing. Please contact support.');
      }

      // Load Razorpay script if not already loaded
      await loadRazorpayScript();

      // Check if Razorpay is loaded
      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Razorpay payment gateway is not available. Please try again.');
      }

      // Initialize Razorpay payment
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount * 100, // Convert to paise
        currency: 'INR',
        name: 'WeDine',
        description: 'Food Order Payment',
        order_id: razorpayOrderId,
        handler: async function(response: RazorpayResponse) {
          console.log('🔍 Debug: Payment completed:', response);
          try {
            // Verify payment and update database
            console.log('🔍 Debug: Starting payment verification...');
            const verifyResponse = await fetch('/api/payment/verify-and-update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                orderDbId: orderDbId
              })
            });

            console.log('🔍 Debug: Payment verification response status:', verifyResponse.status);

            if (!verifyResponse.ok) {
              const errorData = await verifyResponse.json();
              console.error('🔍 Debug: Payment verification failed:', errorData);
              throw new Error(errorData.error || 'Payment verification failed');
            }

            const verifyResult = await verifyResponse.json();
            console.log('🔍 Debug: Payment verification successful:', verifyResult);

            // Execute complete post-payment workflow
            await handlePostPaymentSuccess();

          } catch (error) {
            console.error('🔍 Debug: Error in payment handler:', error);
            setPaymentError(error instanceof Error ? error.message : 'Payment verification failed');
            // Reset processing state on error
            setIsOrderProcessing(false);
            setOrderProcessingType(null);
          }
        },
        modal: {
          ondismiss: function() {
            // Reset processing state if payment is cancelled
            console.log('Payment cancelled by user');
            setIsOrderProcessing(false);
            setOrderProcessingType(null);
            setIsProcessingCOD(false);
          }
        },
        prefill: {
          name: userDetails.name || '',
          email: userDetails.email || '',
          contact: userDetails.phone || ''
        },
        theme: {
          color: '#10b981'
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      console.error('🔍 Debug: Error in online payment:', error);
      setPaymentError(error instanceof Error ? error.message : 'Failed to process online payment');
      // Reset processing state on error
      setIsOrderProcessing(false);
      setOrderProcessingType(null);
    } finally {
      setIsProcessingCOD(false);
    }
  };

  const handleCODOrder = async () => {
    if (!userDetails) return;

    setIsProcessingCOD(true);
    setPaymentError(null);
    setPaymentSuccess(null);

    console.log('🔍 Debug: Starting COD order creation...');

    try {
      // Create order and handle post-payment workflow in parallel for speed
      const [orderResponse, stockResponse] = await Promise.all([
        // 1. Create order
        fetch('/api/orders/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartItems: localCartItems,
            paymentMethod: 'cod',
            userDetails: {
              userId: userDetails.id,
              email: userDetails.email || '',
              name: userDetails.name || '',
              phone: userDetails.phone || ''
            }
          })
        }),
        // 2. Reduce stock (in parallel)
        fetch('/api/products/reduce-stock', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: localCartItems.map(item => ({
              foodId: item.foodId._id,
              quantity: item.quantity
            }))
          })
        })
      ]);

      // Check order creation
      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        
        // Handle duplicate order errors specifically
        if (orderResponse.status === 409) {
          console.warn('Duplicate COD order detected:', errorData);
          toast.error('Order already exists. Please check your orders.');
          // Reset processing state
          setIsOrderProcessing(false);
          setOrderProcessingType(null);
          return;
        }
        
        throw new Error(errorData.error || 'Failed to create COD order');
      }

      const orderData = await orderResponse.json();
      // console.log('🔍 Debug: COD order created successfully:', orderData);

      // Check stock reduction (non-blocking)
      let stockSuccess = false;
      if (stockResponse.ok) {
        const stockResult = await stockResponse.json();
        stockSuccess = true;
        console.log('🔍 Debug: Stock reduced successfully:', stockResult);
      } else {
        console.warn('Stock reduction failed, but order was created successfully');
      }

      // Clear cart immediately (non-blocking)
      clearCart();

      // Show success message immediately
      const successMessage = stockSuccess 
        ? 'COD order placed successfully! Stock updated.'
        : 'COD order placed successfully!';
      
      setPaymentSuccess(successMessage);
      
      // Show toast notification
      toast.success('Order placed successfully!', {
        description: 'Pay when you receive your order.',
        duration: 3000,
      });
      
      // Call the onPlaceOrder callback
      onPlaceOrder('cod');
      
      // Reset processing state
      setIsOrderProcessing(false);
      setOrderProcessingType(null);
      
      // Close popup quickly
      setTimeout(() => {
        onClose();
        setTimeout(() => {
          setPaymentSuccess(null);
        }, 100);
      }, 800); // Reduced from 1500ms to 800ms
      
      console.log('🔍 Debug: COD order workflow completed successfully');
      
    } catch (error) {
      console.error('Error in COD order workflow:', error);
      setPaymentError(error instanceof Error ? error.message : 'Failed to place COD order. Please try again.');
      // Reset processing state on error
      setIsOrderProcessing(false);
      setOrderProcessingType(null);
    } finally {
      setIsProcessingCOD(false);
    }
  };

  // Helper function to clear cart after successful payment
  const clearCartAfterPayment = async () => {
    try {
      // Clear cart in frontend immediately for instant feedback
      clearCart();
      
      // Clear cart in backend (non-blocking)
      fetch('/api/cart/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userDetails?.id,
          cartItems: localCartItems
        })
      }).then(response => {
        if (!response.ok) {
          console.warn('Failed to clear cart in backend, but frontend cart is cleared');
        } else {
          console.log('Cart cleared successfully in backend');
        }
      }).catch(error => {
        console.error('Error clearing cart in backend:', error);
      });
      
      console.log('Cart cleared successfully in frontend');
      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      // Still clear frontend cart even if backend fails
      clearCart();
      return true;
    }
  };

  // Helper function to reduce stock after successful payment
  const reduceStockAfterPayment = async () => {
    try {
      const stockReductionData = localCartItems.map(item => ({
        foodId: item.foodId._id,
        quantity: item.quantity
      }));

      const stockResponse = await fetch('/api/products/reduce-stock', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: stockReductionData
        })
      });

      if (!stockResponse.ok) {
        const errorData = await stockResponse.json();
        console.error('Stock reduction failed:', errorData);
        // Don't show error toast for stock failures - order is still successful
        return false;
      }

      const result = await stockResponse.json();
      console.log('Stock reduced successfully:', result);
      return true;
    } catch (error) {
      console.error('Error reducing stock:', error);
      // Don't show error toast for stock failures - order is still successful
      return false;
    }
  };

  // Complete post-payment workflow
  const handlePostPaymentSuccess = async () => {
    try {
      // Run stock reduction and cart clearing in parallel for speed
      const [stockSuccess] = await Promise.all([
        reduceStockAfterPayment(),
        clearCartAfterPayment()
      ]);
      
      // Show success message immediately
      const successMessage = stockSuccess 
        ? 'Payment successful! Order placed and stock updated.'
        : 'Payment successful! Order placed.';
      
      setPaymentSuccess(successMessage);
      
      // Show toast notification
      toast.success('Order placed successfully!', {
        description: stockSuccess 
          ? 'Your cart has been cleared and stock updated.'
          : 'Your cart has been cleared.',
        duration: 3000, // Reduced from 5000ms
      });
      
      // Call the onPlaceOrder callback
      onPlaceOrder('online');
      
      // Reset processing state
      setIsOrderProcessing(false);
      setOrderProcessingType(null);
      
      // Close popup quickly
      setTimeout(() => {
        onClose();
        setTimeout(() => {
          setPaymentSuccess(null);
        }, 100);
      }, 800); // Reduced from 1500ms to 800ms
      
    } catch (error) {
      console.error('Error in post-payment workflow:', error);
      setPaymentError('Payment successful but there was an issue with order processing. Please contact support.');
      // Reset processing state on error
      setIsOrderProcessing(false);
      setOrderProcessingType(null);
    }
  };

  // Reset processing state when popup closes
  useEffect(() => {
    if (!isOpen) {
      setIsOrderProcessing(false);
      setOrderProcessingType(null);
      setPaymentError(null);
      setPaymentSuccess(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur effect */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Popup Content */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-yellow-800">Complete Your Order</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Payment Method Selection */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4">Payment Method</h3>
          <div className="flex gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="paymentMethod"
                value="cod"
                checked={paymentMethod === 'cod'}
                onChange={(e) => setPaymentMethod(e.target.value as 'cod' | 'online')}
                disabled={isOrderProcessing}
                className="w-5 h-5 text-yellow-600 focus:ring-yellow-500 disabled:opacity-50"
              />
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="font-medium text-gray-700">Cash on Delivery (COD)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="paymentMethod"
                value="online"
                checked={paymentMethod === 'online'}
                onChange={(e) => setPaymentMethod(e.target.value as 'cod' | 'online')}
                disabled={isOrderProcessing}
                className="w-5 h-5 text-yellow-600 focus:ring-yellow-500 disabled:opacity-50"
              />
              <CreditCard className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-700">Online Payment (Razorpay)</span>
            </label>
          </div>
        </div>

        {/* Error/Success Messages */}
        {paymentError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mx-6 mt-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-4 h-4" />
              <span>{paymentError}</span>
            </div>
          </div>
        )}

        {paymentSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg mx-6 mt-4">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-4 h-4" />
              <span>{paymentSuccess}</span>
            </div>
          </div>
        )}

        {/* Order Processing Status */}
        {isOrderProcessing && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mx-6 mt-4">
            <div className="flex items-center gap-2 text-blue-800">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>
                {orderProcessingType === 'cod' 
                  ? 'Processing COD order...' 
                  : 'Processing online payment...'
                }
              </span>
            </div>
          </div>
        )}

        {/* Debug Information (only show in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mx-6 mt-4">
            <div className="text-sm text-blue-800">
              <div className="font-semibold mb-2">🔧 Debug Info:</div>
              <div>• Razorpay Key: {process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ? '✅ Set' : '❌ Not Set'}</div>
              <div>• Window Object: {typeof window !== 'undefined' ? '✅ Available' : '❌ Not Available'}</div>
              <div>• Razorpay SDK: {typeof window !== 'undefined' && (window as unknown as WindowWithRazorpay).Razorpay ? '✅ Loaded' : '❌ Not Loaded'}</div>
              <div>• User Authenticated: {userDetails?.id ? '✅ Yes' : '❌ No'}</div>
              <div>• Order Processing: {isOrderProcessing ? '🔄 Yes' : '✅ No'}</div>
              <div>• Processing Type: {orderProcessingType || 'None'}</div>
            </div>
          </div>
        )}

        {/* Main Content - Two Column Layout */}
        <div className="flex flex-col lg:flex-row h-[60vh] overflow-hidden">
          {/* Left Side - Cart Management */}
          <div className="flex-1 p-6 overflow-y-auto border-r border-gray-200">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4">Your Cart</h3>
            {localCartItems.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🛒</div>
                <p className="text-gray-600">Your cart is empty</p>
              </div>
            ) : (
              <div className="space-y-4">
                {localCartItems.map((item) => (
                  <div key={item._id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <Image
                      src={item.foodId?.image?.asset?.url || item.foodId?.imageUrl || "/placeholder.jpg"}
                      alt={item.foodId?.foodName}
                      width={60}
                      height={60}
                      className="w-15 h-15 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{item.foodId?.foodName}</h4>
                      <p className="text-sm text-gray-600">{item.foodId?.shopRef?.shopName}</p>
                      <p className="text-sm font-medium text-yellow-700">₹{item.price}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleQuantityChange(item._id, -1)}
                        disabled={isOrderProcessing}
                        className="w-8 h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold text-gray-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item._id, 1)}
                        disabled={isOrderProcessing}
                        className="w-8 h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveItem(item._id)}
                        disabled={isOrderProcessing}
                        className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Side - Order Summary */}
          <div className="w-full lg:w-80 p-6 bg-gray-50">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4">Order Summary</h3>
            
            {/* Itemized Breakdown */}
            <div className="space-y-2 mb-4">
              {localCartItems.map((item) => (
                <div key={item._id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.foodId?.foodName} x {item.quantity}
                  </span>
                  <span className="font-medium">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-300 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax (5%)</span>
                <span className="font-medium">₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery Fee</span>
                <span className="font-medium">
                  {deliveryFee === 0 ? 'Free' : `₹${deliveryFee}`}
                </span>
              </div>
              <div className="border-t border-gray-300 pt-2">
                <div className="flex justify-between font-bold text-lg text-yellow-800">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Place Order Button */}
            <button
              data-order-button
              onClick={handlePlaceOrder}
              disabled={isLoading || localCartItems.length === 0 || isProcessingCOD || isOrderProcessing}
              className={`w-full mt-6 py-4 px-6 rounded-2xl font-bold text-white transition-all duration-200 ${
                isLoading || localCartItems.length === 0 || isProcessingCOD || isOrderProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 hover:scale-105 active:scale-95'
              }`}
            >
              {isLoading || isProcessingCOD || isOrderProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {isOrderProcessing 
                    ? (orderProcessingType === 'cod' ? 'Placing COD Order...' : 'Processing Payment...')
                    : isProcessingCOD 
                    ? 'Placing Order...' 
                    : 'Processing...'
                  }
                </div>
              ) : (
                `Place Order - ₹${total.toFixed(2)}`
              )}
            </button>

            {/* Payment Method Info */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                {paymentMethod === 'cod' ? (
                  <>
                    <DollarSign className="w-4 h-4" />
                    <span>Pay when you receive your order</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Secure online payment via Razorpay</span>
                  </>
                )}
              </div>
            </div>

            {/* Order Processing Info */}
            {isOrderProcessing && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <AlertCircle className="w-4 h-4" />
                  <span>Order processing... Please wait</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyNowPopup;