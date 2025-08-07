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
      ownerMobile: foodItem.shopRef?.paymentMobile || foodItem.shopRef?.ownerMobile, // Use paymentMobile first, fallback to ownerMobile
      ownerEmail: foodItem.shopRef?.ownerEmail
    };

    // Format mobile number for Twilio (remove hyphens)
    if (notificationData.ownerMobile) {
      notificationData.ownerMobile = notificationData.ownerMobile.replace(/-/g, '');
    }

    console.log("Calling sendStockOverNotification...");
    console.log("Notification data:", notificationData);
    
    // Check Twilio environment variables before sending
    const twilioConfig = {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER
    };
    
    console.log("🔧 Twilio Configuration Check:");
    console.log("- Account SID:", twilioConfig.accountSid ? "✅ Set" : "❌ Missing");
    console.log("- Auth Token:", twilioConfig.authToken ? "✅ Set" : "❌ Missing");
    console.log("- Phone Number:", twilioConfig.phoneNumber ? "✅ Set" : "❌ Missing");
    
    if (!twilioConfig.accountSid || !twilioConfig.authToken || !twilioConfig.phoneNumber) {
      console.error("❌ Twilio environment variables missing");
      return NextResponse.json({
        error: 'Twilio configuration missing',
        details: {
          accountSid: !!twilioConfig.accountSid,
          authToken: !!twilioConfig.authToken,
          phoneNumber: !!twilioConfig.phoneNumber
        },
        message: 'Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables'
      }, { status: 500 });
    }
    
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