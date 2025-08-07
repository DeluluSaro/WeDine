import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(req: NextRequest) {
  try {
    console.log("=== TWILIO CONFIGURATION TEST ===");
    
    // Check environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    
    console.log("Environment Variables:");
    console.log("- TWILIO_ACCOUNT_SID:", accountSid ? "✅ Set" : "❌ Missing");
    console.log("- TWILIO_AUTH_TOKEN:", authToken ? "✅ Set" : "❌ Missing");
    console.log("- TWILIO_PHONE_NUMBER:", phoneNumber ? "✅ Set" : "❌ Missing");
    
    if (!accountSid || !authToken || !phoneNumber) {
      return NextResponse.json({
        success: false,
        message: "Missing Twilio environment variables",
        details: {
          accountSid: !!accountSid,
          authToken: !!authToken,
          phoneNumber: !!phoneNumber
        }
      }, { status: 400 });
    }
    
    // Test Twilio client initialization
    try {
      const client = twilio(accountSid, authToken);
      console.log("✅ Twilio client initialized successfully");
      
      // Get request body for test SMS
      const { testMobile } = await req.json();
      
      if (testMobile) {
        // Validate mobile number format
        if (!/^\+91[0-9]{10}$/.test(testMobile)) {
          return NextResponse.json({
            success: false,
            message: "Invalid mobile number format",
            expected: "+918754502573",
            received: testMobile
          }, { status: 400 });
        }
        
        // Send test SMS
        console.log(`📱 Sending test SMS to: ${testMobile}`);
        const message = await client.messages.create({
          body: "🧪 Test SMS from WeDine - Twilio integration is working!",
          from: phoneNumber,
          to: testMobile
        });
        
        console.log(`✅ Test SMS sent successfully! SID: ${message.sid}`);
        
        return NextResponse.json({
          success: true,
          message: "Test SMS sent successfully",
          sid: message.sid,
          to: testMobile,
          from: phoneNumber
        });
      } else {
        return NextResponse.json({
          success: true,
          message: "Twilio configuration is valid",
          details: {
            accountSid: accountSid.substring(0, 10) + "...",
            phoneNumber: phoneNumber
          }
        });
      }
      
    } catch (twilioError) {
      console.error("❌ Twilio client error:", twilioError);
      return NextResponse.json({
        success: false,
        message: "Twilio client error",
        error: twilioError instanceof Error ? twilioError.message : "Unknown error"
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error("❌ Test endpoint error:", error);
    return NextResponse.json({
      success: false,
      message: "Test endpoint error",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 