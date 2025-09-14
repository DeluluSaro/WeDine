import { NextRequest, NextResponse } from 'next/server';
import { getShopRFIDData, getLatestRFIDScan } from '@/lib/firebase-rfid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopName = searchParams.get('shopName');

    if (!shopName) {
      return NextResponse.json({
        success: false,
        message: 'Shop name is required'
      }, { status: 400 });
    }

    // Get RFID data from Firebase
    const rfidData = await getShopRFIDData(shopName);
    const latestScan = await getLatestRFIDScan(shopName);

    return NextResponse.json({
      success: true,
      rfidData: rfidData || {},
      latestScan: latestScan,
      shopName: shopName
    });

  } catch (error) {
    console.error('Error fetching RFID data:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch RFID data'
    }, { status: 500 });
  }
}
