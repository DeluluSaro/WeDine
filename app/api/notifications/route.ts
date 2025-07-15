import { NextRequest, NextResponse } from 'next/server';
import { sendStockOverNotification } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    console.log("=== API NOTIFICATION REQUEST ===");
    
    const body = await request.json();
    console.log("Request body:", body);
    
    const { foodItem } = body;

    if (!foodItem) {
      console.error("Missing foodItem in request");
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Transform the data to match the expected NotificationData interface
    const notificationData = {
      shopName: foodItem.shopRef?.shopName || 'Unknown Shop',
      foodName: foodItem.foodName || foodItem.name || 'Unknown Food',
      quantity: foodItem.quantity || 0,
      ownerMobile: foodItem.shopRef?.ownerMobile,
      ownerEmail: foodItem.shopRef?.ownerEmail
    };

    console.log("Calling sendStockOverNotification...");
    console.log("Notification data:", notificationData);
    
    const result = await sendStockOverNotification(notificationData);
    console.log("Notification result:", result);

    if (result.success) {
      console.log("✅ Notifications sent successfully");
      return NextResponse.json({
        success: true,
        message: 'Notifications sent successfully',
        data: result
      });
    } else {
      console.error("❌ Failed to send notifications:", result);
      return NextResponse.json(
        { error: 'Failed to send notifications', details: result },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Notification API error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 