import React, { useState } from 'react';

interface OrderItem {
  foodName: string;
  quantity: number;
  price: number;
}

interface OrderPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: 'cod' | 'online') => void;
  items: OrderItem[];
  totalPrice: number;
  onOnlinePayment?: () => Promise<void>; // New prop for async online payment
}

const OrderPaymentModal: React.FC<OrderPaymentModalProps> = ({ open, onClose, onConfirm, items, totalPrice, onOnlinePayment }) => {
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    if (paymentMethod === 'online' && onOnlinePayment) {
      setLoading(true);
      try {
        await onOnlinePayment();
        setLoading(false);
        onClose();
      } catch {
        setLoading(false);
        // Optionally show error
      }
    } else {
      onConfirm(paymentMethod);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col md:flex-row overflow-hidden">
        {/* Left: Payment selection */}
        <div className="flex-1 p-8 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-yellow-800 mb-6">Select Payment Method</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="accent-yellow-500 w-5 h-5"
                />
                <span className="text-lg font-semibold text-yellow-700">Cash on Delivery</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="online"
                  checked={paymentMethod === 'online'}
                  onChange={() => setPaymentMethod('online')}
                  className="accent-yellow-500 w-5 h-5"
                />
                <span className="text-lg font-semibold text-yellow-700">Online Payment</span>
              </label>
            </div>
          </div>
          <div className="mt-8 flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-400 to-green-500 text-white font-bold hover:from-green-500 hover:to-green-600 transition"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Confirm & Place Order'}
            </button>
          </div>
        </div>
        {/* Right: Order summary */}
        <div className="w-full md:w-80 bg-yellow-50 p-8 border-l border-yellow-200 flex flex-col">
          <h3 className="text-xl font-bold text-yellow-800 mb-4">Order Summary</h3>
          <div className="flex-1 space-y-3 overflow-y-auto">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-yellow-900">
                <span className="font-semibold">{item.quantity}x {item.foodName}</span>
                <span className="text-sm">₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t pt-4 flex justify-between items-center text-lg font-bold text-yellow-900">
            <span>Total</span>
            <span>₹{totalPrice}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderPaymentModal; 