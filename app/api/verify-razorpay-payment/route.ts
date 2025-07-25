import { NextRequest, NextResponse } from 'next/server';
import { writeClient, client } from '@/sanity/lib/client';
import crypto from 'crypto';

// Utility: Notify shop owners after payment
async function notifyShopOwners(order) {
  // Group by shopName and sum totals
  const shopTotals = {};
  if (order.shopName && order.total) {
    // Single-item order
    shopTotals[order.shopName] = (shopTotals[order.shopName] || 0) + order.total;
  } else if (order.items && Array.isArray(order.items)) {
    // Multi-item order (if you ever support it)
    for (const item of order.items) {
      const shop = item.foodId?.shopRef?.shopName || item.shopName;
      const total = (item.price || 0) * (item.quantity || 0);
      shopTotals[shop] = (shopTotals[shop] || 0) + total;
    }
  }
  // Notify each shop owner
  for (const shopName of Object.keys(shopTotals)) {
    // Fetch shop owner mobile/email
    const shop = await client.fetch(`*[_type == "shop" && shopName == $shopName][0]{ownerMobile, ownerEmail}`, { shopName });
    const amount = shopTotals[shopName];
    // Placeholder: send SMS/email
    if (shop?.ownerMobile) {
      console.log(`Send SMS to ${shop.ownerMobile}: You have a new order. Amount: ₹${amount}`);
      // Integrate SMS API here
    }
    if (shop?.ownerEmail) {
      console.log(`Send Email to ${shop.ownerEmail}: You have a new order. Amount: ₹${amount}`);
      // Integrate email API here
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = await req.json();
    if (!orderId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
    }
    // Fetch the order
    const order = await client.fetch(`*[_type == "order" && orderId == $orderId][0]`, { orderId: Number(orderId) });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    // Verify signature
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    const generated_signature = crypto
      .createHmac('sha256', key_secret as string)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }
    // Update order paymentStatus
    await writeClient.patch(order._id).set({ paymentStatus: true, razorpay_payment_id }).commit();
    // Notify shop owners
    await notifyShopOwners(order);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 