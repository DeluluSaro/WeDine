import { NextRequest, NextResponse } from 'next/server';
import { writeClient, client } from '@/sanity/lib/client';

export async function POST(req: NextRequest) {
  try {
    const { userId, items, total, createdAt } = await req.json();
    if (!userId || !items || !Array.isArray(items) || items.length === 0 || !total || !createdAt) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const order = await writeClient.create({
      _type: 'order',
      userId,
      items,
      total,
      createdAt,
    });
    return NextResponse.json({ success: true, order });
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
    const query = `*[_type == "order" && userId == $userId] | order(createdAt desc)`;
    const orders = await client.fetch(query, { userId });
    return NextResponse.json({ orders });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
} 