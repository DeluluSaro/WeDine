// lib/notifications.ts
import twilio from 'twilio';

interface NotificationData {
  shopName: string;
  foodName: string;
  quantity: number;
  ownerMobile?: string;
  ownerEmail?: string;
}

interface SMSResult {
  success: boolean;
  message: string;
  sid?: string;
  error?: string;
}

// SMS notification function using Twilio
async function sendSMSNotification(
  ownerMobile: string,
  foodName: string,
  shopName: string
): Promise<SMSResult> {
  try {
    // Check if Twilio environment variables are set
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !phoneNumber) {
      console.error("❌ Twilio environment variables missing:");
      console.error("- TWILIO_ACCOUNT_SID:", !!accountSid);
      console.error("- TWILIO_AUTH_TOKEN:", !!authToken);
      console.error("- TWILIO_PHONE_NUMBER:", !!phoneNumber);
      return {
        success: false,
        message: "Twilio configuration missing. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.",
        error: "Missing Twilio environment variables"
      };
    }

    // Validate mobile number format
    if (!ownerMobile || !/^\+91[0-9]{10}$/.test(ownerMobile)) {
      console.error("❌ Invalid mobile number format:", ownerMobile);
      return {
        success: false,
        message: "Invalid mobile number format. Expected: +918754502573",
        error: "Invalid mobile number format"
      };
    }

    console.log("🔧 Twilio Configuration:");
    console.log("- Account SID:", accountSid.substring(0, 10) + "...");
    console.log("- Auth Token:", authToken.substring(0, 10) + "...");
    console.log("- Phone Number:", phoneNumber);
    console.log("- To Mobile:", ownerMobile);

    // Initialize Twilio client with environment variables
    const client = twilio(accountSid, authToken);

    // Send SMS message
    const message = await client.messages.create({
      body: `🚨 STOCK ALERT: ${foodName} is out of stock at ${shopName}. Please restock immediately!`,
      from: phoneNumber,
      to: ownerMobile
    });

    console.log(`✅ SMS sent successfully! SID: ${message.sid}`);
    return { success: true, message: "SMS notification sent", sid: message.sid };
  } catch (error) {
    console.error("❌ SMS notification failed:", error);
    
    // Handle specific Twilio errors
    if (error instanceof Error) {
      if (error.message.includes('Authentication')) {
        return {
          success: false,
          message: "Twilio authentication failed. Check your Account SID and Auth Token.",
          error: error.message
        };
      } else if (error.message.includes('phone number')) {
        return {
          success: false,
          message: "Invalid phone number format or Twilio phone number not verified.",
          error: error.message
        };
      }
    }
    
    return { 
      success: false, 
      message: "SMS notification failed", 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export const sendStockOverNotification = async (data: NotificationData) => {
  console.log("=== NOTIFICATION FUNCTION DEBUG ===");
  console.log("Food Item:", data);
  console.log("Shop Ref:", data.shopName);
  console.log("User Email:", data.ownerEmail);

  const { foodName, shopName } = data;
  const ownerMobile = data.ownerMobile;
  const ownerEmail = data.ownerEmail;

  console.log("Extracted data:");
  console.log("- Food Name:", foodName);
  console.log("- Shop Name:", shopName);
  console.log("- Owner Mobile:", ownerMobile);
  console.log("- Owner Email:", ownerEmail);

  // Check if we have the required data
  if (!foodName || !shopName) {
    console.error("Missing required data: foodName or shopName");
    return {
      success: false,
      message: "Missing required data",
      details: { foodName: !!foodName, shopName: !!shopName }
    };
  }

  const results = {
    sms: null as SMSResult | null,
    success: false,
    message: "",
    details: {}
  };

  // Send SMS notification if mobile number is available
  if (ownerMobile) {
    console.log(`📱 Sending SMS to: ${ownerMobile}`);
    results.sms = await sendSMSNotification(ownerMobile, foodName, shopName);
    
    if (results.sms.success) {
      console.log("✅ SMS sent successfully");
      results.success = true;
      results.message = "SMS notification sent successfully";
    } else {
      console.error("❌ SMS failed:", results.sms);
      results.message = "SMS notification failed";
    }
  } else {
    console.log("⚠️ No mobile number available for SMS");
    results.message = "No mobile number available for notifications";
  }

  results.details = {
    foodName,
    shopName,
    ownerMobile: ownerMobile || "Not provided",
    ownerEmail: ownerEmail || "Not provided",
    smsResult: results.sms
  };

  console.log("Final notification result:", results);
  return results;
} 