import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';
import Razorpay from 'razorpay';

/**
 * POST /api/razorpay/routes
 * Creates Razorpay routes for shop payments
 * This API helps generate Razorpay account IDs for shops
 */
export async function POST(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    // Check Razorpay configuration
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ 
        error: 'Razorpay configuration missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET' 
      }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const body = await req.json();
    const { shopId, shopName, ownerMobile, ownerEmail } = body;

    if (!shopId || !shopName || !ownerMobile) {
      return NextResponse.json({ 
        error: 'Missing required fields: shopId, shopName, and ownerMobile are required' 
      }, { status: 400 });
    }

    // Check if shop exists
    const shop = await client.fetch(
      `*[_type == "shop" && _id == $shopId][0]`,
      { shopId }
    );

    if (!shop) {
      return NextResponse.json({ 
        error: 'Shop not found' 
      }, { status: 404 });
    }

    // Check if shop already has a Razorpay account ID
    if (shop.razorpayAccountId) {
      return NextResponse.json({ 
        success: true,
        message: 'Shop already has a Razorpay account ID',
        razorpayAccountId: shop.razorpayAccountId,
        shopId: shop._id,
        shopName: shop.shopName
      });
    }

    try {
      // Create a Razorpay route for this shop
      // Note: This is a simplified approach. In production, you might need to:
      // 1. Create a Razorpay account for the shop
      // 2. Set up proper KYC verification
      // 3. Configure transfer settings
      
      // For now, we'll generate a unique account ID based on shop details
      const accountId = `acc_${shopId.slice(-8)}_${Date.now()}`;
      
      // In a real implementation, you would call Razorpay's API to create an account:
      // const account = await razorpay.accounts.create({
      //   email: ownerEmail || `${shopName.toLowerCase().replace(/\s+/g, '_')}@wedine.com`,
      //   phone: ownerMobile,
      //   legal_business_name: shopName,
      //   business_type: 'partnership',
      //   profile: {
      //     category: 'food_and_beverage',
      //     subcategory: 'restaurant'
      //   }
      // });

      // Update shop with Razorpay account ID
      const updatedShop = await writeClient
        .patch(shopId)
        .set({
          razorpayAccountId: accountId,
          updatedAt: new Date().toISOString()
        })
        .commit();

      return NextResponse.json({
        success: true,
        message: 'Razorpay account ID generated successfully',
        razorpayAccountId: accountId,
        shopId: shop._id,
        shopName: shop.shopName,
        ownerMobile: ownerMobile,
        ownerEmail: ownerEmail,
        // In production, you would return the actual Razorpay account details:
        // accountDetails: {
        //   id: account.id,
        //   email: account.email,
        //   phone: account.phone,
        //   status: account.status
        // }
      });

    } catch (razorpayError) {
      console.error('Razorpay account creation error:', razorpayError);
      return NextResponse.json({ 
        error: 'Failed to create Razorpay account',
        details: razorpayError instanceof Error ? razorpayError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Razorpay routes error:', error);
    return NextResponse.json({ 
      error: 'Failed to create Razorpay route',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/razorpay/routes
 * Gets Razorpay account information for shops
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get('shopId');

    if (!shopId) {
      return NextResponse.json({ 
        error: 'Shop ID is required' 
      }, { status: 400 });
    }

    const shop = await client.fetch(
      `*[_type == "shop" && _id == $shopId][0] {
        _id,
        shopName,
        razorpayAccountId,
        ownerMobile,
        ownerEmail,
        isActive
      }`,
      { shopId }
    );

    if (!shop) {
      return NextResponse.json({ 
        error: 'Shop not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      shop: {
        id: shop._id,
        shopName: shop.shopName,
        razorpayAccountId: shop.razorpayAccountId,
        ownerMobile: shop.ownerMobile,
        ownerEmail: shop.ownerEmail,
        isActive: shop.isActive,
        hasRazorpayAccount: !!shop.razorpayAccountId
      }
    });

  } catch (error) {
    console.error('Get Razorpay routes error:', error);
    return NextResponse.json({ 
      error: 'Failed to get Razorpay account information',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/razorpay/routes
 * Updates Razorpay account information for a shop
 */
export async function PUT(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const body = await req.json();
    const { shopId, razorpayAccountId } = body;

    if (!shopId || !razorpayAccountId) {
      return NextResponse.json({ 
        error: 'Shop ID and Razorpay Account ID are required' 
      }, { status: 400 });
    }

    // Check if shop exists
    const shop = await client.fetch(
      `*[_type == "shop" && _id == $shopId][0]`,
      { shopId }
    );

    if (!shop) {
      return NextResponse.json({ 
        error: 'Shop not found' 
      }, { status: 404 });
    }

    // Update shop with new Razorpay account ID
    const updatedShop = await writeClient
      .patch(shopId)
      .set({
        razorpayAccountId,
        updatedAt: new Date().toISOString()
      })
      .commit();

    return NextResponse.json({
      success: true,
      message: 'Razorpay account ID updated successfully',
      shop: {
        id: updatedShop._id,
        shopName: updatedShop.shopName,
        razorpayAccountId: updatedShop.razorpayAccountId
      }
    });

  } catch (error) {
    console.error('Update Razorpay routes error:', error);
    return NextResponse.json({ 
      error: 'Failed to update Razorpay account ID',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
