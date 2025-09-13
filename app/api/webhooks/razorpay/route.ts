import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/sanity/lib/client';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    
    if (!signature) {
      return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    
    // Handle payment success event
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const order = event.payload.order.entity;
      
      // Extract user email from order notes
      const userEmail = order.notes?.userEmail;
      const amount = parseFloat(order.notes?.amount || '0');
      
      if (!userEmail || !amount) {
        console.error('Missing user email or amount in webhook');
        return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
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

      // Check if transaction already exists
      const existingTransaction = wallet.transactions?.find(
        (tx: any) => tx.paymentId === payment.id
      );

      if (existingTransaction) {
        console.log('Transaction already processed:', payment.id);
        return NextResponse.json({ success: true, message: 'Transaction already processed' });
      }

      // Add transaction and update balance
      const newTransaction = {
        type: 'add',
        amount: amount,
        description: `Added ₹${amount} to wallet via Razorpay`,
        paymentId: payment.id,
        orderId: order.id,
        timestamp: new Date().toISOString()
      };

      const updatedTransactions = [...(wallet.transactions || []), newTransaction];
      const newBalance = (wallet.balance || 0) + amount;

      // Update wallet
      await writeClient
        .patch(wallet._id)
        .set({
          balance: newBalance,
          transactions: updatedTransactions,
          lastUpdated: new Date().toISOString()
        })
        .commit();

      console.log(`Wallet updated for ${userEmail}: +₹${amount}, New balance: ₹${newBalance}`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
