import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { mobileNumber } = await req.json();
    
    if (!mobileNumber) {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 });
    }

    // Format mobile number for Twilio (remove hyphens)
    const formattedMobile = mobileNumber.replace(/-/g, '');
    
    // Validate format
    const isValidFormat = /^\+91[0-9]{10}$/.test(formattedMobile);
    
    return NextResponse.json({
      success: true,
      original: mobileNumber,
      formatted: formattedMobile,
      isValid: isValidFormat,
      message: isValidFormat ? 'Mobile number is valid for Twilio' : 'Mobile number format is invalid'
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to format mobile number',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 