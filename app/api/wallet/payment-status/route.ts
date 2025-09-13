import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/sanity/lib/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const userEmail = searchParams.get('userEmail');

    if (!orderId || !userEmail) {
      return NextResponse.json({ 
        success: false, 
        message: 'Order ID and user email are required' 
      }, { status: 400 });
    }

    // Check if payment was successful by looking for the transaction
    const wallet = await writeClient.fetch(
      `*[_type == "wallet" && userEmail == $userEmail][0]`,
      { userEmail }
    );

    if (!wallet) {
      return NextResponse.json({ 
        success: false, 
        message: 'Wallet not found' 
      }, { status: 404 });
    }

    // Look for transaction with this order ID
    const transaction = wallet.transactions?.find(
      (tx: any) => tx.orderId === orderId && tx.type === 'add'
    );

    if (transaction) {
      return NextResponse.json({ 
        success: true, 
        paymentCompleted: true,
        amount: transaction.amount,
        timestamp: transaction.timestamp,
        paymentId: transaction.paymentId
      });
    }

    return NextResponse.json({ 
      success: true, 
      paymentCompleted: false 
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to check payment status' 
    }, { status: 500 });
  }
}
