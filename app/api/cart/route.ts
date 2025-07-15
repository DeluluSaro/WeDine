import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';

export async function POST(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }
    const body = await req.json();
    const { userId, foodId, quantity, price } = body;
    if (!userId || !foodId || !quantity || !price) {
      return NextResponse.json({ error: 'Missing fields', received: { userId, foodId, quantity, price } }, { status: 400 });
    }

    // Check if cart item already exists for this user and foodId
    const existing = await client.fetch(
      `*[_type == "cartItem" && userId == $userId && foodId._ref == $foodId][0]`,
      { userId, foodId }
    );

    const cartItemId = existing?._id;
    let result;
    if (cartItemId) {
      // Increment quantity
      result = await writeClient.patch(cartItemId)
        .inc({ quantity })
        .set({ price })
        .commit();
    } else {
      // Create new cart item
      result = await writeClient.create({
        _type: 'cartItem',
        userId,
        foodId: { _type: 'reference', _ref: foodId },
        quantity,
        price,
        createdAt: new Date().toISOString(),
      });
    }
    return NextResponse.json({ success: true, cartItem: result });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('CART API ERROR:', err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}

// PATCH: Decrement quantity or delete if quantity is 1
export async function PATCH(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }
    const body = await req.json();
    const { cartItemId } = body;
    if (!cartItemId) {
      return NextResponse.json({ error: 'Missing cartItemId' }, { status: 400 });
    }
    // Fetch current quantity
    const item = await client.fetch(`*[_type == "cartItem" && _id == $cartItemId][0]`, { cartItemId });
    if (!item) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }
    if (item.quantity > 1) {
      // Decrement quantity
      const updated = await writeClient.patch(cartItemId)
        .dec({ quantity: 1 })
        .commit();
      return NextResponse.json({ success: true, cartItem: updated });
    } else {
      // Delete item
      await writeClient.delete(cartItemId);
      return NextResponse.json({ success: true, deleted: true });
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('CART API PATCH ERROR:', err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}

// DELETE: Remove an item entirely
export async function DELETE(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }
    const { searchParams } = new URL(req.url);
    const cartItemId = searchParams.get('cartItemId');
    if (!cartItemId) {
      return NextResponse.json({ error: 'Missing cartItemId' }, { status: 400 });
    }
    await writeClient.delete(cartItemId);
    return NextResponse.json({ success: true, deleted: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('CART API DELETE ERROR:', err);
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
    const cartItems = await client.fetch(
      `*[_type == "cartItem" && userId == $userId]{
        _id,
        quantity,
        price,
        createdAt,
        foodId->{_id, foodName, price, imageUrl, image, shopRef->{shopName}}
      }`,
      { userId }
    );
    return NextResponse.json({ success: true, cartItems });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('CART API ERROR:', err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
} 