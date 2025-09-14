import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Test if environment variables are set
    const envCheck = {
      RESEND_API_KEY: process.env.RESEND_API_KEY ? 'Set' : 'Not set',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'Not set',
      NODE_ENV: process.env.NODE_ENV || 'Not set'
    };

    console.log('Environment check:', envCheck);

    return NextResponse.json({
      success: true,
      message: 'Email service test',
      environment: envCheck,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json(
      { success: false, message: 'Test failed', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
