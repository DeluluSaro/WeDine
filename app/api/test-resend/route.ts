import { NextRequest, NextResponse } from 'next/server';
import { testResendConnection } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    console.log("Testing Resend connection...");
    const isWorking = await testResendConnection();
    
    if (isWorking) {
      return NextResponse.json({
        success: true,
        message: 'Resend is working correctly'
      });
    } else {
      return NextResponse.json(
        { error: 'Resend test failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Resend test error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 