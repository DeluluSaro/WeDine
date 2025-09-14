import { NextRequest, NextResponse } from 'next/server';
import { storeRFIDData } from '@/lib/firebase-rfid';

export async function POST(request: NextRequest) {
  try {
    const { shopName, cardId } = await request.json();

    // Validate required fields
    if (!shopName || !cardId) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: shopName, cardId'
      }, { status: 400 });
    }

    // Store simplified RFID data in Firebase (only card ID and shop name)
    const success = await storeRFIDData(shopName, cardId);

    if (!success) {
      return NextResponse.json({
        success: false,
        message: 'Failed to store RFID data'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'RFID data captured and stored successfully',
      data: {
        cardId: cardId,
        shopName: shopName,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error capturing RFID data:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to capture RFID data'
    }, { status: 500 });
  }
}
