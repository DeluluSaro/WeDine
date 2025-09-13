import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');

    if (!userEmail) {
      return NextResponse.json({ success: false, message: 'User email is required' }, { status: 400 });
    }

    const wallet = await client.fetch(
      `*[_type == "wallet" && userEmail == $userEmail][0]{
        balance,
        transactions,
        isActive,
        lastUpdated
      }`,
      { userEmail }
    );

    if (!wallet) {
      return NextResponse.json({ success: false, message: 'Wallet not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      balance: wallet.balance,
      transactions: wallet.transactions || [],
      isActive: wallet.isActive,
      lastUpdated: wallet.lastUpdated
    });

  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to fetch wallet balance' 
    }, { status: 500 });
  }
}
