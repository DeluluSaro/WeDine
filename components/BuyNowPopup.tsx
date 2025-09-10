"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Minus, Trash2, CreditCard, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from "sonner";
import { calculateTotalAmount } from '@/lib/razorpay';
import { useCart, CartItem } from './CartContext';
import Image from 'next/image';

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  modal: {
    ondismiss: () => void;
  };
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
}

interface WindowWithRazorpay extends Window {
  Razorpay: new (options: RazorpayOptions) => {
    open: () => void;
  };
}

interface OrderData {
  orderDbId: string;
  orderId: string;
  amount: number;
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
  onPlaceOrder: (paymentMethod: 'cod' | 'online') => void;
  isLoading?: boolean;
  userDetails?: {
    userId: string;
    email?: string;
    name?: string;
    phone?: string;
  };
}

export default function BuyNowPopup({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onPlaceOrder,
  isLoading = false,
  userDetails
}: BuyNowPopupProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [localCartItems, setLocalCartItems] = useState<CartItem[]>(cartItems);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
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

  const handlePlaceOrder = async (paymentMethod: 'cod' | 'online') => {
    if (isOrderProcessing) {
      console.log('🔍 Debug: Order already being processed, ignoring duplicate request');
      return; // Prevent multiple simultaneous order requests
    }
    
    if (!userDetails || cartItems.length === 0) {
      toast.error('Invalid order data. Please try again.');
      return;
    }

    // Set processing state immediately to prevent double-clicks
    setIsOrderProcessing(true);
    setOrderProcessingType(paymentMethod);
    setPaymentError(null);

    try {
      console.log('🔍 Debug: Starting order creation...');
      console.log('🔍 Debug: Cart items:', cartItems);
      console.log('🔍 Debug: Payment method:', paymentMethod);
      console.log('🔍 Debug: User details:', userDetails);

      // Validate userDetails before sending
      if (!userDetails?.userId) {
        throw new Error('User ID is missing from userDetails');
      }

      const requestBody = {
        cartItems: cartItems,
        paymentMethod: paymentMethod,
        userDetails: userDetails
      };

      console.log('🔍 Debug: Request body being sent:', JSON.stringify(requestBody, null, 2));

      // Create order in database
      const orderResponse = await fetch('/api/orders/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('🔍 Debug: Order creation response status:', orderResponse.status);

      if (!orderResponse.ok) {
        let errorData;
        try {
          errorData = await orderResponse.json();
        } catch {
          errorData = { error: 'Failed to parse error response' };
        }
        console.error('🔍 Debug: Order creation failed:', errorData);
        console.error('🔍 Debug: Response status:', orderResponse.status);
        console.error('🔍 Debug: Response headers:', Object.fromEntries(orderResponse.headers.entries()));
        
        // Handle duplicate order errors specifically
        if (orderResponse.status === 409) {
          console.warn('Duplicate order detected:', errorData);
          toast.error('Order already exists. Please check your orders.');
          // Reset processing state
          setIsOrderProcessing(false);
          setOrderProcessingType(null);
          return;
        }

        // Handle stock reduction errors
        if (orderResponse.status === 400 && errorData.error?.includes('stock')) {
          console.warn('Stock reduction failed:', errorData);
          toast.error('Some items are out of stock. Please check availability and try again.');
          // Reset processing state
          setIsOrderProcessing(false);
          setOrderProcessingType(null);
          return;
        }
        
        throw new Error(errorData.error || `Failed to create order (Status: ${orderResponse.status})`);
      }

      const orderData: OrderData = await orderResponse.json();
      console.log('🔍 Debug: Order created successfully:', orderData);

      if (paymentMethod === 'online') {
        // Handle online payment
        await handleOnlinePayment(orderData);
      } else {
        // Handle COD order
        await handleCODOrder(orderData);
      }

    } catch (error) {
      console.error('🔍 Debug: Error in order processing:', error);
      setPaymentError(error instanceof Error ? error.message : 'Order processing failed');
    } finally {
      // Reset processing state
      setIsOrderProcessing(false);
      setOrderProcessingType(null);
    }
  };

  const handleOnlinePayment = async (orderData: OrderData) => {
    try {
      // Check if Razorpay is available
      if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
        throw new Error('Razorpay configuration is missing. Please contact support.');
      }

      // Load Razorpay script if not already loaded
      await loadRazorpayScript();

      // Check if Razorpay is loaded
      if (typeof (window as any).Razorpay === 'undefined') {
        throw new Error('Razorpay payment gateway is not available. Please try again.');
      }

      // Initialize Razorpay payment
      const options: RazorpayOptions = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount * 100, // Convert to paise
        currency: 'INR',
        name: 'WeDine',
        description: 'Food Order Payment',
        order_id: orderData.orderId,
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
                orderDbId: orderData.orderDbId
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
          }
        },
        modal: {
          ondismiss: function() {
            // Reset processing state if payment is cancelled
            console.log('Payment cancelled by user');
            setIsOrderProcessing(false);
            setOrderProcessingType(null);
          }
        },
        prefill: {
          name: userDetails?.name || '',
          email: userDetails?.email || '',
          contact: userDetails?.phone || ''
        },
        theme: {
          color: '#10b981'
        }
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('🔍 Debug: Error in online payment:', error);
      setPaymentError(error instanceof Error ? error.message : 'Online payment failed');
    }
  };

  const handleCODOrder = async (_orderData: OrderData) => {
    try {
      // For COD orders, just show success
      setPaymentSuccess('Order placed successfully! You will pay on delivery.');
      onClose();
      toast.success('Order placed successfully! You will pay on delivery.');
    } catch (error) {
      console.error('🔍 Debug: Error in COD order:', error);
      setPaymentError(error instanceof Error ? error.message : 'COD order failed');
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
          userId: userDetails?.userId,
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

  // Complete post-payment workflow
  const handlePostPaymentSuccess = async () => {
    try {
      // Clear cart after successful payment
      await clearCartAfterPayment();
      
      // Show success message
      setPaymentSuccess('Payment successful! Order placed successfully.');
      
      // Show toast notification
      toast.success('Order placed successfully!', {
        description: 'Your cart has been cleared.',
        duration: 3000,
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
      }, 800);
      
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
              <div>• User Authenticated: {userDetails?.userId ? '✅ Yes' : '❌ No'}</div>
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
              onClick={() => handlePlaceOrder(paymentMethod)}
              disabled={isLoading || localCartItems.length === 0 || isOrderProcessing}
              className={`w-full mt-6 py-4 px-6 rounded-2xl font-bold text-white transition-all duration-200 ${
                isLoading || localCartItems.length === 0 || isOrderProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 hover:scale-105 active:scale-95'
              }`}
            >
              {isLoading || isOrderProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {orderProcessingType === 'cod' ? 'Placing COD Order...' : 'Processing Payment...'}
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