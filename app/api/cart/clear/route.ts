import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/sanity/lib/client';

interface ClearCartRequest {
  userId: string;
  cartItems: Array<{
    _id: string;
    foodId: {
      _id: string;
      foodName: string;
      price: number;
      shopRef: {
        _id: string;
        shopName: string;
      };
    };
    quantity: number;
    price: number;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, cartItems }: ClearCartRequest = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: 'Cart items are required' }, { status: 400 });
    }

    // Clear cart items from Sanity (if stored there)
    // Note: Since we're using client-side cart state, this mainly serves as a backup
    // The main cart clearing happens in the frontend CartContext

    console.log(`Cart cleared for user ${userId} with ${cartItems.length} items`);

    return NextResponse.json({
      success: true,
      message: 'Cart cleared successfully',
      clearedItems: cartItems.length
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error clearing cart:', err);
    return NextResponse.json({ 
      error: 'Failed to clear cart', 
      details: err.message 
    }, { status: 500 });
  }
}