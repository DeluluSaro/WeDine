import { NextRequest, NextResponse } from 'next/server';
import { storeRFIDData } from '@/lib/firebase-rfid';

export async function POST(request: NextRequest) {
  try {
    const { shopName, cardId, deviceId, userEmail, studentName } = await request.json();

    // Validate required fields
    if (!shopName || !cardId) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: shopName, cardId'
      }, { status: 400 });
    }

    // Create RFID data object
    const rfidData = {
      cardId: cardId,
      timestamp: new Date().toISOString(),
      deviceId: deviceId || 'unknown',
      userEmail: userEmail || '',
      studentName: studentName || '',
      isVerified: false
    };

    // Store in Firebase
    const success = await storeRFIDData(shopName, rfidData);

    if (!success) {
      return NextResponse.json({
        success: false,
        message: 'Failed to store RFID data'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'RFID data captured and stored successfully',
      data: rfidData
    });

  } catch (error) {
    console.error('Error capturing RFID data:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to capture RFID data'
    }, { status: 500 });
  }
}
