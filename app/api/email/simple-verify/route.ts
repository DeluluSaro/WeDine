import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, rfidCardId, studentName, userId } = await request.json();

    console.log('Simple email verification request:', { email, rfidCardId, studentName, userId });

    if (!email || !rfidCardId || !studentName || !userId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate verification token
    const verificationToken = Math.random().toString(36).substring(2, 15) + 
                             Math.random().toString(36).substring(2, 15);
    
    // Store verification data temporarily
    const verificationData = {
      email,
      rfidCardId,
      studentName,
      userId,
      token: verificationToken,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
      verified: false
    };

    // Store in memory
    if (!global.verificationTokens) {
      global.verificationTokens = new Map();
    }
    global.verificationTokens.set(verificationToken, verificationData);

    // Create verification URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/api/email/confirm-rfid?token=${verificationToken}`;

    // For development, just return the verification URL
    // In production, you would send an actual email here
    console.log('=== VERIFICATION DETAILS ===');
    console.log('Email:', email);
    console.log('Student Name:', studentName);
    console.log('RFID Card ID:', rfidCardId);
    console.log('Verification URL:', verificationUrl);
    console.log('=============================');

    return NextResponse.json({
      success: true,
      message: 'Verification link generated! Check the console for the link.',
      verificationUrl: verificationUrl,
      email: email,
      rfidCardId: rfidCardId,
      studentName: studentName,
      instructions: 'Copy the verification URL from the console and open it in your browser to complete registration.'
    });

  } catch (error) {
    console.error('Simple email verification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
