import { useCallback } from 'react';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

export function useRazorpay() {
  return useCallback(async (options: any) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      alert('Failed to load Razorpay SDK. Please check your internet connection.');
      return false;
    }
    const key = options.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) {
      alert('Razorpay Key ID is missing. Please set NEXT_PUBLIC_RAZORPAY_KEY_ID in your .env.local file.');
      return false;
    }
    options.key = key;
    // @ts-ignore
    const rzp = new window.Razorpay(options);
    rzp.open();
    return true;
  }, []);
} 