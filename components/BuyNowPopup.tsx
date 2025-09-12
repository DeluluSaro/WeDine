'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Trash2, CreditCard, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCart, CartItem } from './CartContext';
import Image from 'next/image';

// --- INTERFACES ---

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
  modal: { ondismiss: () => void; };
  prefill: { name: string; email: string; contact: string; };
  theme: { color: string; };
}

interface WindowWithRazorpay extends Window {
  Razorpay: new (options: RazorpayOptions) => { open: () => void; };
}

interface OrderData {
    orderId: string;
    amount: number; // This amount is in paise for online, rupees for COD
    orders?: Array<{
        orderId: string;
        orderIdentifier: string;
        shopName: string;
        amount: number;
        razorpayAccountId: string;
    }>;
}

// --- SCRIPT LOADER ---

const loadRazorpayScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay script. Check network/ad-blocker.'));
    document.body.appendChild(script);
  });
};

// --- COMPONENT PROPS ---

interface BuyNowPopupProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onPlaceOrder: (paymentMethod: 'cod' | 'online') => void;
  userDetails?: { userId: string; email?: string; name?: string; phone?: string; };
}

// --- COMPONENT ---

export default function BuyNowPopup({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onPlaceOrder,
  userDetails
}: BuyNowPopupProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('online');
  const [localCartItems, setLocalCartItems] = useState<CartItem[]>(cartItems);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [isOrderProcessing, setIsOrderProcessing] = useState(false);

  useEffect(() => { setLocalCartItems(cartItems); }, [cartItems]);

  const subtotal = localCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handlePlaceOrder = async () => {
    if (isOrderProcessing || !userDetails || cartItems.length === 0) {
      toast.error('Cannot process order. User or cart details are missing.');
      return;
    }

    setIsOrderProcessing(true);
    setPaymentError(null);

    // Determine which API endpoint to call
    const endpoint = paymentMethod === 'online' 
        ? '/api/orders/create-online-order' 
        : '/api/orders/create-cod-order';

    try {
      const orderResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItems, userDetails })
      });

      if (!orderResponse.ok) {
        let errorMsg = `Failed to create order (Status: ${orderResponse.status})`;
        try {
            const errorData = await orderResponse.json();
            errorMsg = errorData.error || errorMsg;
        } catch (e) {
            console.error(`Could not parse error response JSON from ${endpoint}.`);
        }
        throw new Error(errorMsg);
      }

      const orderData = await orderResponse.json();

      if (paymentMethod === 'online') {
        await handleOnlinePayment(orderData);
      } else {
        await handlePostPaymentSuccess('cod');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Order processing failed';
      console.error("Order processing failed:", error);
      setPaymentError(errorMessage);
      setIsOrderProcessing(false);
    }
  };

  const handleOnlinePayment = async (orderData: OrderData) => {
    try {
      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!razorpayKey) throw new Error('Razorpay Key ID is not configured.');

      await loadRazorpayScript();

      const options: RazorpayOptions = {
        key: razorpayKey,
        amount: orderData.amount, // Amount is already in paise from backend
        order_id: orderData.orderId,
        name: 'WeDine',
        description: 'Complete your payment',
        handler: async (response: RazorpayResponse) => {
          try {
            // For test mode, we'll use the orderIds instead of signature verification
            const verificationData = orderData.orders && orderData.orders.length > 0 
              ? { orderIds: orderData.orders.map(order => order.orderId) }
              : { ...response };

            const verifyResponse = await fetch('/api/payment/verify-and-update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(verificationData)
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
        modal: { ondismiss: () => setIsOrderProcessing(false) },
        prefill: { name: userDetails?.name || '', email: userDetails?.email || '', contact: userDetails?.phone || '' },
        theme: { color: '#FFB300' }
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Online payment failed');
      setIsOrderProcessing(false);
    }
  };

  const handlePostPaymentSuccess = async (method: 'cod' | 'online') => {
    try {
      cartItems.forEach(item => onRemoveItem(item._id));
      setPaymentSuccess(`Order placed successfully!`);
      toast.success('Order placed successfully!');
      onPlaceOrder(method);
      setTimeout(() => { onClose(); setTimeout(() => setPaymentSuccess(null), 500); }, 1500);
    } catch (error) {
      setPaymentError('There was an issue finalizing your order.');
    } finally {
      setIsOrderProcessing(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setIsOrderProcessing(false);
      setPaymentError(null);
      setPaymentSuccess(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-yellow-800">Complete Your Order</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-6 h-6 text-gray-600" /></button>
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4">Order Summary</h3>
            <div className="space-y-4 mb-6">
                {localCartItems.map((item) => (
                  <div key={item._id} className="flex items-center gap-4">
                    <Image src={item.foodId?.image?.asset?.url || item.foodId?.imageUrl || "/placeholder.jpg"} alt={item.foodId?.foodName || ''} width={48} height={48} className="w-12 h-12 object-cover rounded-lg" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{item.foodId?.foodName}</h4>
                      <p className="text-sm text-gray-600">{item.quantity} x ₹{item.price}</p>
                    </div>
                    <div className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                ))}
            </div>
            <div className="border-t pt-4">
                <div className="flex justify-between font-bold text-xl text-yellow-800"><span>Total</span><span>₹{subtotal.toFixed(2)}</span></div>
            </div>
            <div className="mt-8">
                <h3 className="text-lg font-semibold text-yellow-800 mb-4">Payment Method</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition ${paymentMethod === 'online' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}><input type="radio" name="paymentMethod" value="online" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} className="w-5 h-5 text-green-600 focus:ring-green-500"/><CreditCard className="w-6 h-6 text-green-600" /><span className="font-semibold text-lg text-gray-800">Pay Online</span></label>
                    <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition ${paymentMethod === 'cod' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}><input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="w-5 h-5 text-blue-600 focus:ring-blue-500"/><DollarSign className="w-6 h-6 text-blue-600" /><span className="font-semibold text-lg text-gray-800">Cash on Delivery</span></label>
                </div>
            </div>

            {paymentError && <div className="mt-6 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2"><AlertCircle size={16} /> {paymentError}</div>}
            {paymentSuccess && <div className="mt-6 p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2"><CheckCircle size={16} /> {paymentSuccess}</div>}

            <button onClick={handlePlaceOrder} disabled={localCartItems.length === 0 || isOrderProcessing} className={`w-full mt-8 py-4 px-6 rounded-xl font-bold text-white transition-all duration-200 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700`}>
              {isOrderProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </div>
              ) : (`Place Order (₹${subtotal.toFixed(2)})`)}
            </button>
        </div>
      </div>
    </div>
  );
};