import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/sanity/lib/client';

export async function POST(request: NextRequest) {
  try {
    const { rfidCardId, orderId, shopName } = await request.json();

    console.log('RFID Direct Payment:', { rfidCardId, orderId, shopName });

    // Validate required fields
    if (!rfidCardId || !orderId || !shopName) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: rfidCardId, orderId, shopName'
      }, { status: 400 });
    }

    // Get order details
    const order = await writeClient.fetch(
      `*[_type == "order" && _id == $orderId][0]{
        _id,
        orderId,
        userId,
        userEmail,
        items,
        total,
        paymentStatus,
        status,
        requiredRfidCardId
      }`,
      { orderId }
    );

    if (!order) {
      return NextResponse.json({
        success: false,
        message: 'Order not found'
      }, { status: 404 });
    }

    // Check if order is already paid
    if (order.paymentStatus) {
      return NextResponse.json({
        success: false,
        message: 'Order already paid'
      }, { status: 400 });
    }

    // Check if RFID matches order requirement (if specified)
    if (order.requiredRfidCardId && order.requiredRfidCardId !== rfidCardId) {
      return NextResponse.json({
        success: false,
        message: 'RFID card does not match order requirement',
        requiredRfid: order.requiredRfidCardId,
        providedRfid: rfidCardId
      }, { status: 400 });
    }

    // Get user's wallet
    const wallet = await writeClient.fetch(
      `*[_type == "wallet" && userEmail == $userEmail][0]{
        _id,
        balance,
        transactions,
        rfidCardId,
        studentName
      }`,
      { userEmail: order.userEmail }
    );

    if (!wallet) {
      return NextResponse.json({
        success: false,
        message: 'User wallet not found'
      }, { status: 404 });
    }

    // Verify RFID card matches wallet
    if (wallet.rfidCardId !== rfidCardId) {
      return NextResponse.json({
        success: false,
        message: 'RFID card does not match user wallet',
        walletRfid: wallet.rfidCardId,
        providedRfid: rfidCardId
      }, { status: 400 });
    }

    // Check sufficient balance
    if (wallet.balance < order.total) {
      return NextResponse.json({
        success: false,
        message: 'Insufficient wallet balance',
        currentBalance: wallet.balance,
        requiredAmount: order.total,
        shortfall: order.total - wallet.balance
      }, { status: 400 });
    }

    // Get shop details
    const shop = await writeClient.fetch(
      `*[_type == "shop" && shopName == $shopName][0]{
        _id,
        shopName,
        ownerEmail,
        paymentId,
        bankAccountNumber,
        bankIfsc,
        bankAccountName
      }`,
      { shopName }
    );

    if (!shop) {
      return NextResponse.json({
        success: false,
        message: 'Shop not found'
      }, { status: 404 });
    }

    // Process payment
    const newBalance = wallet.balance - order.total;
    const paymentTransaction = {
      type: 'payment',
      amount: order.total,
      description: `RFID Payment for Order #${order.orderId || order._id.slice(-6)}`,
      orderId: order._id,
      paymentId: `rfid_${Date.now()}`,
      timestamp: new Date().toISOString(),
      rfidCardId: rfidCardId,
      shopName: shopName,
      studentName: wallet.studentName
    };

    const updatedTransactions = [...(wallet.transactions || []), paymentTransaction];

    // Update user's wallet
    await writeClient
      .patch(wallet._id)
      .set({
        balance: newBalance,
        transactions: updatedTransactions,
        lastUpdated: new Date().toISOString()
      })
      .commit();

    // Update order payment status
    await writeClient
      .patch(order._id)
      .set({
        paymentStatus: true,
        paymentMethod: 'rfid',
        paymentId: paymentTransaction.paymentId,
        paidAt: new Date().toISOString(),
        rfidCardId: rfidCardId,
        shopName: shopName,
        status: 'paid'
      })
      .commit();

    // Transfer money to shop owner using Razorpay Payouts
    let transferResult = null;
    if (shop.paymentId) {
      try {
        console.log(`Transferring ₹${order.total} to shop owner ${shop.ownerEmail} (Payment ID: ${shop.paymentId})`);
        
        // Create Razorpay Payout to transfer money to shop owner
        const payoutOptions = {
          account_number: shop.paymentId, // Shop owner's Razorpay account number
          fund_account: {
            account_type: 'bank_account',
            bank_account: {
              name: shop.bankAccountName || (shop.shopName + ' Owner'),
              ifsc: shop.bankIfsc || 'HDFC0000001',
              account_number: shop.bankAccountNumber || shop.paymentId
            }
          },
          amount: Math.round(order.total * 100), // Convert to paise
          currency: 'INR',
          mode: 'IMPS',
          purpose: 'payout',
          queue_if_low_balance: true,
          reference_id: `rfid_payout_${order._id}_${Date.now()}`,
          narration: `RFID Payment from ${wallet.studentName} for Order #${order.orderId || order._id.slice(-6)}`
        };

        // Create the payout
        const payout = await razorpay.payouts.create(payoutOptions);
        
        transferResult = {
          success: true,
          payoutId: payout.id,
          status: payout.status,
          amount: order.total
        };
        
        console.log('Payout created successfully:', payout);
        
      } catch (payoutError) {
        console.error('Error creating payout to shop owner:', payoutError);
        transferResult = {
          success: false,
          error: payoutError instanceof Error ? payoutError.message : 'Payout failed'
        };
        
        // Don't fail the entire payment if payout fails
        // The money is already deducted from user's wallet
        console.log('Payout failed, but payment to user is still processed');
      }
    } else {
      console.log('Shop does not have payment ID configured, skipping payout');
      transferResult = {
        success: false,
        error: 'Shop payment ID not configured'
      };
    }

    return NextResponse.json({
      success: true,
      message: 'RFID payment processed successfully',
      paymentId: paymentTransaction.paymentId,
      newBalance: newBalance,
      orderTotal: order.total,
      studentName: wallet.studentName,
      shopName: shopName,
      transferToShopOwner: transferResult
    });

  } catch (error) {
    console.error('Error processing RFID direct payment:', error);
    return NextResponse.json({
      success: false,
      message: `Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
