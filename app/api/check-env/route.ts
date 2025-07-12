import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const envCheck = {
      RESEND_API_KEY_EXISTS: !!process.env.RESEND_API_KEY,
      RESEND_API_KEY_STARTS_WITH: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 10) + "..." : "NOT_SET",
      TWILIO_ACCOUNT_SID_EXISTS: !!process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN_EXISTS: !!process.env.TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER_EXISTS: !!process.env.TWILIO_PHONE_NUMBER,
      NODE_ENV: process.env.NODE_ENV,
      ALL_ENV_KEYS: Object.keys(process.env).filter(key => key.includes('RESEND') || key.includes('TWILIO'))
    };

    return NextResponse.json({
      success: true,
      environment: envCheck
    });
    
  } catch (error) {
    console.error('Environment check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 