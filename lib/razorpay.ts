import Razorpay from 'razorpay';

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

console.log('RAZORPAY_KEY_ID:', key_id);
console.log('RAZORPAY_KEY_SECRET:', key_secret);

if (!key_id || !key_secret) {
  throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables');
}

export const razorpay = new Razorpay({
  key_id,
  key_secret,
}); 