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
    // Initialize Twilio client with environment variables
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Send SMS message
    const message = await client.messages.create({
      body: `🚨 STOCK ALERT: ${foodName} is out of stock at ${shopName}. Please restock immediately!`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: ownerMobile
    });

    console.log(`SMS sent successfully! SID: ${message.sid}`);
    return { success: true, message: "SMS notification sent", sid: message.sid };
  } catch (error) {
    console.error("SMS notification failed:", error);
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