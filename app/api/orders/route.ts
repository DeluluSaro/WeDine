import { NextRequest, NextResponse } from 'next/server';
import { writeClient, client } from '@/sanity/lib/client';

// Helper to fetch shop ownerMobile by shopName
async function getShopOwnerMobile(shopName) {
  const shop = await client.fetch(`*[_type == "shop" && shopName == $shopName][0]{ownerMobile}`, { shopName });
  return shop?.ownerMobile || null;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, userEmail, items, total, createdAt, paymentMethod } = await req.json();
    if (!userId || !userEmail || !items || !Array.isArray(items) || items.length === 0 || !createdAt) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    // Group items by shopName
    const shopTotals = {};
    for (const item of items) {
      const shopName = item.foodId?.shopRef?.shopName || item.shopName;
      if (!shopTotals[shopName]) shopTotals[shopName] = 0;
      shopTotals[shopName] += (item.price || 0) * (item.quantity || 0);
    }
    for (const shopName of Object.keys(shopTotals)) {
      const ownerMobile = await getShopOwnerMobile(shopName);
      // TODO: Integrate with your UPI payout API here
      console.log(`Would pay ₹${shopTotals[shopName]} to ${shopName} (owner mobile: ${ownerMobile})`);
    }
    const baseOrderId = Date.now();
    const createdOrders = [];
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      if (item.foodId?._id) {
        const foodDoc = await client.fetch(`*[_type == "foodItem" && _id == $id][0]{quantity,_rev}`, { id: item.foodId._id });
        if (!foodDoc || typeof foodDoc.quantity !== 'number') {
          return NextResponse.json({ error: `Food item not found` }, { status: 404 });
        }
        if (foodDoc.quantity < item.quantity) {
          return NextResponse.json({ error: `Out of stock for ${item.foodId.foodName}` }, { status: 409 });
        }
        try {
          await writeClient.patch(item.foodId._id)
            .ifRevisionId(foodDoc._rev)
            .dec({ quantity: item.quantity })
            .commit();
        } catch (err) {
          return NextResponse.json({ error: `Stock changed, please try again for ${item.foodId.foodName}` }, { status: 409 });
        }
      }
      let foodImageUrl = "/placeholder.jpg";
      if (item.foodId?.image?.asset?.url) {
        foodImageUrl = item.foodId.image.asset.url;
      } else if (item.foodId?.imageUrl) {
        foodImageUrl = item.foodId.imageUrl;
      }
      // Set paymentStatus based on paymentMethod
      const paymentStatus = paymentMethod === 'online' ? false : true;
      const order = await writeClient.create({
        _type: 'order',
        orderId: baseOrderId + idx,
        userId,
        userEmail,
        foodId: item.foodId?._id || item.foodId,
        foodName: item.foodId?.foodName || item.foodName,
        shopName: item.foodId?.shopRef?.shopName || item.shopName,
        quantityOrdered: item.quantity,
        status: 'ordered',
        createdAt,
        paymentStatus,
        foodImageUrl,
        total: (item.price || 0) * (item.quantity || 0),
      });
      createdOrders.push(order);
    }
    // For online payment, return orderId(s) for Stripe metadata
    if (paymentMethod === 'online') {
      return NextResponse.json({ success: true, orders: createdOrders, orderIds: createdOrders.map(o => o.orderId) });
    }
    // For COD, return as before
    return NextResponse.json({ success: true, orders: createdOrders });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }
    // Query for orders for this user
    const query = `*[_type == "order" && userId == $userId] | order(createdAt desc){
  _id,
  orderId,
  foodName,
  shopName,
  quantityOrdered,
  foodImageUrl,
  status,
  createdAt,
  paymentStatus,
  total
}`;
    const orders = await client.fetch(query, { userId });
    return NextResponse.json({ orders });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}

// Move order to history if status is 'Ready' and paymentStatus is true
export async function PATCH(req: NextRequest) {
  try {
    const { orderId, status, paymentStatus } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }
    // Fetch the order
    const order = await client.fetch(`*[_type == "order" && orderId == $orderId][0]`, { orderId });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    // Update status and paymentStatus
    await writeClient.patch(order._id).set({ status, paymentStatus }).commit();
    // If status is 'Ready' and paymentStatus is true, move to history
    if (status === 'Ready' && paymentStatus === true) {
      // Create in history
      await writeClient.create({
        _type: 'history',
        ...order,
        status,
        paymentStatus,
        updatedAt: new Date().toISOString(),
      });
      // Delete from order
      await writeClient.delete(order._id);
      return NextResponse.json({ success: true, movedToHistory: true });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}

// Function to delete all orders at 12:01 AM (to be called by a scheduled job)
export async function DELETE() {
  try {
    const orders = await client.fetch(`*[_type == "order"]{_id}`);
    for (const order of orders) {
      await writeClient.delete(order._id);
    }
    return NextResponse.json({ success: true, deleted: orders.length });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
} 