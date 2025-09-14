import { NextRequest, NextResponse } from 'next/server';
import { sendOTP, verifyOTP } from '@/lib/otp-service';
import { writeClient } from '@/sanity/lib/client';

// Send OTP for RFID registration
export async function POST(request: NextRequest) {
  try {
    const { email, rfidCardId, studentName } = await request.json();

    // Validate required fields
    if (!email || !rfidCardId) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: email, rfidCardId'
      }, { status: 400 });
    }

    // Check if RFID card already exists
    const existingCard = await writeClient.fetch(
      `*[_type == "rfidCard" && cardId == $cardId][0]`,
      { cardId: rfidCardId }
    );

    if (existingCard) {
      return NextResponse.json({
        success: false,
        message: 'RFID card already registered'
      }, { status: 400 });
    }

    // Send OTP
    const result = await sendOTP(email, rfidCardId);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: result.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Error sending OTP for RFID registration:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to send OTP'
    }, { status: 500 });
  }
}

// Verify OTP and register RFID card
export async function PUT(request: NextRequest) {
  try {
    const { email, rfidCardId, otp, studentName } = await request.json();

    // Validate required fields
    if (!email || !rfidCardId || !otp) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: email, rfidCardId, otp'
      }, { status: 400 });
    }

    // Verify OTP
    const otpResult = verifyOTP(email, rfidCardId, otp);

    if (!otpResult.success) {
      return NextResponse.json({
        success: false,
        message: otpResult.message
      }, { status: 400 });
    }

    // Create RFID card in Sanity
    const rfidCardData = {
      _type: 'rfidCard',
      cardId: rfidCardId,
      userEmail: email,
      studentName: studentName || '',
      isActive: true,
      isBlocked: false,
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString()
    };

    const createdCard = await writeClient.create(rfidCardData);

    return NextResponse.json({
      success: true,
      message: 'RFID card registered successfully',
      cardId: createdCard._id
    });

  } catch (error) {
    console.error('Error registering RFID card:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to register RFID card'
    }, { status: 500 });
  }
}
