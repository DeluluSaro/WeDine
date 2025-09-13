import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/sanity/lib/client';

// This API is for testing purposes only - creates a test wallet with some balance
export async function POST(request: NextRequest) {
  try {
    const { userEmail, testBalance = 1000 } = await request.json();

    if (!userEmail) {
      return NextResponse.json({ 
        success: false, 
        message: 'User email is required' 
      }, { status: 400 });
    }

    // Check if wallet already exists
    const existingWallet = await writeClient.fetch(
      `*[_type == "wallet" && userEmail == $userEmail][0]`,
      { userEmail }
    );

    if (existingWallet) {
      return NextResponse.json({ 
        success: true, 
        message: 'Test wallet already exists',
        wallet: existingWallet 
      });
    }

    // Create test wallet with some balance
    const testWallet = await writeClient.create({
      _type: 'wallet',
      userEmail,
      balance: testBalance,
      transactions: [
        {
          type: 'add',
          amount: testBalance,
          description: 'Test wallet setup - Initial balance',
          timestamp: new Date().toISOString()
        }
      ],
      isActive: true,
      lastUpdated: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Test wallet created successfully',
      wallet: testWallet 
    });

  } catch (error) {
    console.error('Error creating test wallet:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to create test wallet',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
