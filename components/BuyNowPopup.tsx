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
  orderId: string;
  amount: number;
  splits: any[];
  orderItems: any[];
  sanitizedOrderIdentifier: string;
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

  useEffect(() => {
    setLocalCartItems(cartItems);
  }, [cartItems]);

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
    if (isOrderProcessing) return;
    if (!userDetails || cartItems.length === 0) {
      toast.error('Invalid order data.');
      return;
    }

    setIsOrderProcessing(true);
    setOrderProcessingType(paymentMethod);
    setPaymentError(null);

    try {
      const requestBody = {
        cartItems: cartItems,
        paymentMethod: paymentMethod,
        userDetails: userDetails
      };

      const orderResponse = await fetch('/api/orders/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({ error: 'Failed to create order' }));
        throw new Error(errorData.error || `Failed to create order (Status: ${orderResponse.status})`);
      }

      const orderData = await orderResponse.json();

      if (paymentMethod === 'online') {
        await handleOnlinePayment(orderData);
      } else {
        await handleCODOrder(orderData);
      }

    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Order processing failed');
      setIsOrderProcessing(false);
      setOrderProcessingType(null);
    }
  };

  const handleOnlinePayment = async (orderData: OrderData) => {
    try {
      if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
        throw new Error('Razorpay configuration is missing.');
      }

      await loadRazorpayScript();

      const options: RazorpayOptions = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount * 100,
        currency: 'INR',
        name: 'WeDine',
        description: 'Food Order Payment',
        order_id: orderData.orderId,
        handler: async (response: RazorpayResponse) => {
          try {
            const verifyResponse = await fetch('/api/payment/verify-and-update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                orderItems: orderData.orderItems,
                userDetails: userDetails,
                sanitizedOrderIdentifier: orderData.sanitizedOrderIdentifier,
                total: orderData.amount,
                splits: orderData.splits
              })
            });

            if (!verifyResponse.ok) {
              const errorData = await verifyResponse.json();
              throw new Error(errorData.error || 'Payment verification failed');
            }

            await handlePostPaymentSuccess('online');

          } catch (error) {
            setPaymentError(error instanceof Error ? error.message : 'Payment verification failed');
          }
        },
        modal: {
          ondismiss: () => {
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
          color: '#FFB300'
        }
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Online payment failed');
      setIsOrderProcessing(false);
      setOrderProcessingType(null);
    }
  };

  const handleCODOrder = async (_orderData: any) => {
    await handlePostPaymentSuccess('cod');
  };

  const handlePostPaymentSuccess = async (method: 'cod' | 'online') => {
    try {
      clearCart();
      setPaymentSuccess(method === 'online' ? 'Payment successful! Order placed.' : 'Order placed successfully!');
      toast.success('Order placed successfully!');
      
      onPlaceOrder(method);
      
      setTimeout(() => {
        onClose();
        setTimeout(() => setPaymentSuccess(null), 500);
      }, 1500);

    } catch (error) {
      setPaymentError('There was an issue finalizing your order.');
    } finally {
        setIsOrderProcessing(false);
        setOrderProcessingType(null);
    }
  };

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
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-yellow-800">Complete Your Order</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          <div className="flex-1 p-6 overflow-y-auto border-r border-gray-200">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4">Your Cart</h3>
            {localCartItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Your cart is empty.</div>
            ) : (
              <div className="space-y-4">
                {localCartItems.map((item) => (
                  <div key={item._id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <Image
                      src={item.foodId?.image?.asset?.url || item.foodId?.imageUrl || "/placeholder.jpg"}
                      alt={item.foodId?.foodName || ''}
                      width={60}
                      height={60}
                      className="w-15 h-15 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{item.foodId?.foodName}</h4>
                      <p className="text-sm text-gray-600">₹{item.price}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleQuantityChange(item._id, -1)} disabled={isOrderProcessing} className="w-8 h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center hover:bg-yellow-600 transition disabled:opacity-50">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold text-gray-800">{item.quantity}</span>
                      <button onClick={() => handleQuantityChange(item._id, 1)} disabled={isOrderProcessing} className="w-8 h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center hover:bg-yellow-600 transition disabled:opacity-50">
                        <Plus className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleRemoveItem(item._id)} disabled={isOrderProcessing} className="p-2 rounded-full hover:bg-red-100 transition disabled:opacity-50">
                        <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="w-full lg:w-96 p-6 bg-gray-50 flex flex-col">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4">Order Summary</h3>
            <div className="space-y-2 mb-4 flex-1">
                <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span className="font-medium">₹{subtotal}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Tax (5%)</span><span className="font-medium">₹{tax.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Delivery Fee</span><span className="font-medium">{deliveryFee === 0 ? 'Free' : `₹${deliveryFee}`}</span></div>
                <div className="border-t border-gray-300 pt-2 mt-2"><div className="flex justify-between font-bold text-lg text-yellow-800"><span>Total</span><span>₹{total.toFixed(2)}</span></div></div>
            </div>
            
            <div>
                <h3 className="text-lg font-semibold text-yellow-800 mb-4">Payment Method</h3>
                <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition"><input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} disabled={isOrderProcessing} className="w-5 h-5 text-yellow-600 focus:ring-yellow-500"/><DollarSign className="w-5 h-5 text-green-600" /><span className="font-medium text-gray-700">Cash on Delivery</span></label>
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition"><input type="radio" name="paymentMethod" value="online" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} disabled={isOrderProcessing} className="w-5 h-5 text-yellow-600 focus:ring-yellow-500"/><CreditCard className="w-5 h-5 text-blue-600" /><span className="font-medium text-gray-700">Pay Online</span></label>
                </div>
            </div>

            {paymentError && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2"><AlertCircle size={16} /> {paymentError}</div>}
            {paymentSuccess && <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2"><CheckCircle size={16} /> {paymentSuccess}</div>}

            <button
              onClick={() => handlePlaceOrder(paymentMethod)}
              disabled={isLoading || localCartItems.length === 0 || isOrderProcessing}
              className={`w-full mt-6 py-4 px-6 rounded-xl font-bold text-white transition-all duration-200 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed ${isOrderProcessing ? '' : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'}`}
            >
              {isOrderProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                `Place Order (₹${total.toFixed(2)})`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};