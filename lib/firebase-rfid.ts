import { ref, set, get, push, onValue, off, DataSnapshot } from 'firebase/database';
import { database } from './firebase';

export interface RFIDData {
  cardId: string;
  shopName: string;
  timestamp: string;
}

export interface ShopRFIDData {
  [cardId: string]: RFIDData;
}

// Create a shop in Firebase Realtime Database
export async function createShopInFirebase(shopName: string, shopId?: string) {
  try {
    const shopRef = ref(database, `shops/${shopName}`);
    await set(shopRef, {
      shopId: shopId || shopName,
      shopName: shopName,
      createdAt: new Date().toISOString(),
      status: 'active',
      rfidData: {}
    });
    console.log(`Shop ${shopName} created in Firebase`);
    return true;
  } catch (error) {
    console.error('Error creating shop in Firebase:', error);
    return false;
  }
}

// Store RFID data for a specific shop (simplified - only card ID and shop name)
export async function storeRFIDData(shopName: string, cardId: string) {
  try {
    const rfidRef = ref(database, `shops/${shopName}/rfidData/${cardId}`);
    await set(rfidRef, {
      cardId: cardId,
      shopName: shopName,
      timestamp: new Date().toISOString()
    });
    console.log(`RFID data stored for shop ${shopName}:`, cardId);
    return true;
  } catch (error) {
    console.error('Error storing RFID data:', error);
    return false;
  }
}

// Get all RFID data for a specific shop
export async function getShopRFIDData(shopName: string): Promise<ShopRFIDData | null> {
  try {
    const rfidRef = ref(database, `shops/${shopName}/rfidData`);
    const snapshot = await get(rfidRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error('Error getting shop RFID data:', error);
    return null;
  }
}

// Get the latest RFID scan for a shop (most recent card)
export async function getLatestRFIDScan(shopName: string): Promise<RFIDData | null> {
  try {
    const rfidRef = ref(database, `shops/${shopName}/rfidData`);
    const snapshot = await get(rfidRef);
    
    if (snapshot.exists()) {
      const rfidData = snapshot.val();
      const cardEntries = Object.entries(rfidData) as [string, RFIDData][];
      
      if (cardEntries.length > 0) {
        // Sort by timestamp and get the latest
        const latestEntry = cardEntries.sort((a, b) => {
          const timestampA = new Date(a[1].timestamp).getTime();
          const timestampB = new Date(b[1].timestamp).getTime();
          return timestampB - timestampA; // Most recent first
        })[0];
        
        // Validate that the timestamp is recent (within last 5 minutes)
        const scanTime = new Date(latestEntry[1].timestamp).getTime();
        const now = Date.now();
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        
        if (scanTime > fiveMinutesAgo) {
          console.log(`Latest RFID scan: ${latestEntry[1].cardId} at ${latestEntry[1].timestamp}`);
          return latestEntry[1];
        } else {
          console.log(`RFID scan too old: ${latestEntry[1].cardId} at ${latestEntry[1].timestamp}`);
          return null;
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting latest RFID scan:', error);
    return null;
  }
}

// Listen to real-time changes in RFID data for a shop
export function listenToShopRFIDData(shopName: string, callback: (data: ShopRFIDData | null) => void) {
  const rfidRef = ref(database, `shops/${shopName}/rfidData`);
  
  const unsubscribe = onValue(rfidRef, (snapshot: DataSnapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  });

  return unsubscribe;
}

// Get all shops
export async function getAllShops() {
  try {
    const shopsRef = ref(database, 'shops');
    const snapshot = await get(shopsRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error('Error getting all shops:', error);
    return null;
  }
}

// Verify RFID card exists in any shop
export async function verifyRFIDCard(cardId: string): Promise<{ exists: boolean; shopName?: string; data?: RFIDData }> {
  try {
    const shops = await getAllShops();
    if (!shops) return { exists: false };

    for (const [shopName, shopData] of Object.entries(shops) as [string, any][]) {
      if (shopData.rfidData && shopData.rfidData[cardId]) {
        return {
          exists: true,
          shopName,
          data: shopData.rfidData[cardId]
        };
      }
    }

    return { exists: false };
  } catch (error) {
    console.error('Error verifying RFID card:', error);
    return { exists: false };
  }
}

// Update RFID card verification status
export async function updateRFIDVerification(shopName: string, cardId: string, isVerified: boolean) {
  try {
    const rfidRef = ref(database, `shops/${shopName}/rfidData/${cardId}/isVerified`);
    await set(rfidRef, isVerified);
    return true;
  } catch (error) {
    console.error('Error updating RFID verification:', error);
    return false;
  }
}
