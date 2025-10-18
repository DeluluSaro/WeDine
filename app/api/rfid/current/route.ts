import { NextRequest, NextResponse } from 'next/server';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';

/**
 * GET /api/rfid/current
 * Gets the current RFID card data from Firebase Realtime Database
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopName = searchParams.get('shopName');

    if (!shopName) {
      return NextResponse.json({ 
        error: 'Shop name is required' 
      }, { status: 400 });
    }

    // Get RFID data from Firebase using the correct structure: shops/{shopName}/rfidData
    const rfidRef = ref(database, `shops/${shopName}/rfidData`);
    const snapshot = await get(rfidRef);

    if (snapshot.exists()) {
      const rfidData = snapshot.val();
      
      // Get the latest RFID card (assuming there might be multiple cards)
      const cardIds = Object.keys(rfidData);
      let latestCard = null;
      let latestTimestamp = 0;

      // Find the card with the latest timestamp
      for (const cardId of cardIds) {
        const card = rfidData[cardId];
        const timestamp = parseInt(card.timestamp) || 0;
        if (timestamp > latestTimestamp) {
          latestTimestamp = timestamp;
          latestCard = card;
        }
      }

      if (latestCard) {
        return NextResponse.json({
          success: true,
          rfidData: {
            cardId: latestCard.cardId || null,
            timestamp: latestCard.timestamp || null,
            shopName: latestCard.shopName || shopName,
            deviceId: latestCard.deviceId || null,
            userEmail: latestCard.userEmail || null,
            studentName: latestCard.studentName || null,
            isVerified: latestCard.isVerified || false
          },
          lastUpdated: latestCard.timestamp || null,
          allCards: rfidData // Include all cards for debugging
        });
      }
    }

    return NextResponse.json({
      success: true,
      rfidData: null,
      message: `No RFID data found for shop: ${shopName}`
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Firebase RFID fetch error:', err);
    return NextResponse.json({
      error: 'Failed to fetch RFID data from Firebase',
      details: err.message
    }, { status: 500 });
  }
}
