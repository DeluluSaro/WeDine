import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/sanity/lib/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const shopId = searchParams.get('shopId');
    const userEmail = searchParams.get('userEmail');
    const cardId = searchParams.get('cardId');

    if (orderId) {
      // Check payment status for specific order
      const order = await writeClient.fetch(
        `*[_type == "order" && _id == $orderId][0]{
          _id,
          paymentStatus,
          rfidPaymentMode,
          rfidPaymentEnabledAt,
          paymentMethod,
          paymentId
        }`,
        { orderId }
      );

      if (!order) {
        return NextResponse.json({ 
          success: false, 
          message: 'Order not found' 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true,
        orderId: order._id,
        paymentCompleted: order.paymentStatus,
        rfidPaymentMode: order.rfidPaymentMode,
        paymentMethod: order.paymentMethod,
        paymentId: order.paymentId,
        enabledAt: order.rfidPaymentEnabledAt
      });

    } else if (cardId) {
      // Check RFID card status by card ID
      const rfidCard = await writeClient.fetch(
        `*[_type == "rfidCard" && cardId == $cardId][0]{
          _id,
          cardId,
          userEmail,
          studentName,
          isActive,
          isBlocked,
          createdAt,
          lastUsedAt
        }`,
        { cardId }
      );

      return NextResponse.json({ 
        success: true,
        rfidCard: rfidCard || null
      });

    } else if (userEmail) {
      // Check RFID card status for user
      const rfidCard = await writeClient.fetch(
        `*[_type == "rfidCard" && userEmail == $userEmail && isActive == true && isBlocked != true][0]{
          _id,
          cardId,
          userEmail,
          studentName,
          isActive,
          isBlocked,
          createdAt,
          lastUsedAt
        }`,
        { userEmail }
      );

      return NextResponse.json({ 
        success: true,
        rfidCard: rfidCard || null
      });

    } else if (shopId) {
      // Check device status for shop
      // In a real implementation, this would check actual device connectivity
      // For now, we'll simulate device status
      const deviceStatus = {
        connected: true, // This should be checked against actual device
        lastSeen: new Date().toISOString(),
        deviceId: `SHOP_${shopId}`,
        status: 'online'
      };

      return NextResponse.json({ 
        success: true,
        deviceStatus
      });

    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Order ID, Shop ID, User Email, or Card ID required' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error checking RFID status:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to check RFID status' 
    }, { status: 500 });
  }
}
