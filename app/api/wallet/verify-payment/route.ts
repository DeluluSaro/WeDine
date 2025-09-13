import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/sanity/lib/client';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { paymentId, orderId, signature, userEmail, amount } = await request.json();

    if (!paymentId || !orderId || !signature || !userEmail || !amount) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required payment verification data' 
      }, { status: 400 });
    }

    // Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid payment signature' 
      }, { status: 400 });
    }

    // Get or create wallet
    let wallet = await writeClient.fetch(
      `*[_type == "wallet" && userEmail == $userEmail][0]`,
      { userEmail }
    );

    if (!wallet) {
      // Create wallet if doesn't exist
      wallet = await writeClient.create({
        _type: 'wallet',
        userEmail,
        balance: 0,
        transactions: [],
        isActive: true,
        lastUpdated: new Date().toISOString()
      });
    }

    // Add transaction and update balance
    const newTransaction = {
      type: 'add',
      amount: amount,
      description: `Added ₹${amount} to wallet via Razorpay`,
      paymentId: paymentId,
      timestamp: new Date().toISOString()
    };

    const updatedTransactions = [...(wallet.transactions || []), newTransaction];
    const newBalance = (wallet.balance || 0) + amount;

    // Update wallet
    const updatedWallet = await writeClient
      .patch(wallet._id)
      .set({
        balance: newBalance,
        transactions: updatedTransactions,
        lastUpdated: new Date().toISOString()
      })
      .commit();

    return NextResponse.json({ 
      success: true, 
      message: 'Payment verified and wallet updated successfully',
      wallet: updatedWallet
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to verify payment' 
    }, { status: 500 });
  }
}
