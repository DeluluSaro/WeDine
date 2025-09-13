import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/sanity/lib/client';

export async function POST(request: NextRequest) {
  try {
    const { userEmail, balance = 0 } = await request.json();

    if (!userEmail) {
      return NextResponse.json({ success: false, message: 'User email is required' }, { status: 400 });
    }

    // Check if wallet already exists
    const existingWallet = await writeClient.fetch(
      `*[_type == "wallet" && userEmail == $userEmail][0]`,
      { userEmail }
    );

    if (existingWallet) {
      return NextResponse.json({ 
        success: true, 
        message: 'Wallet already exists',
        wallet: existingWallet 
      });
    }

    // Create new wallet
    const wallet = await writeClient.create({
      _type: 'wallet',
      userEmail,
      balance,
      transactions: [],
      isActive: true,
      lastUpdated: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Wallet created successfully',
      wallet 
    });

  } catch (error) {
    console.error('Error creating wallet:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to create wallet' 
    }, { status: 500 });
  }
}
