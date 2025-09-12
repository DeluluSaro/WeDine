import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';
import Razorpay from 'razorpay';

interface CartItemForBackend {
  _id: string;
  quantity: number;
  price: number;
  foodId: {
    _id: string;
    foodName: string;
    shopRef: {
      _id: string;
      shopName: string;
    };
  };
}

interface UserDetails {
  userId: string;
  email?: string;
  name?: string;
  phone?: string;
  address?: string;
}

interface ShopPaymentInfo {
  shopId: string;
  shopName: string;
  razorpayAccountId: string;
  amount: number;
  items: any[];
}

export async function POST(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const { cartItems, userDetails }: { cartItems: CartItemForBackend[], userDetails: UserDetails } = await req.json();

    if (!cartItems || cartItems.length === 0 || !userDetails?.userId) {
      return NextResponse.json({ 
        error: 'Invalid request: cart items and user details are required' 
      }, { status: 400 });
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

    // Fetch food items with shop information including Razorpay account IDs
    const itemIds = cartItems.map(item => item.foodId._id);
    const sanityQuery = `*[_type == "foodItem" && _id in $itemIds]{
      _id, 
      price, 
      foodName,
      "shopName": shopRef->shopName,
      "shopId": shopRef->_id,
      "razorpayAccountId": shopRef->razorpayAccountId
    }`;
    const sanityItems: any[] = await client.fetch(sanityQuery, { itemIds });
    const sanityItemsMap = new Map(sanityItems.map(item => [item._id, item]));

    // Group items by shop and calculate payments
    const shopPayments: { [shopId: string]: ShopPaymentInfo } = {};
    let totalAmount = 0;

    for (const cartItem of cartItems) {
      const sanityItem = sanityItemsMap.get(cartItem.foodId._id);
      if (!sanityItem) {
        throw new Error(`Item ${cartItem.foodId.foodName} not found in database`);
      }

      const shopId = sanityItem.shopId;
      const itemTotal = sanityItem.price * cartItem.quantity;

      if (!shopPayments[shopId]) {
        if (!sanityItem.razorpayAccountId) {
          throw new Error(`Shop ${sanityItem.shopName} is missing Razorpay Account ID. Please configure it in the shop settings.`);
        }

        shopPayments[shopId] = {
          shopId,
          shopName: sanityItem.shopName,
          razorpayAccountId: sanityItem.razorpayAccountId,
          amount: 0,
          items: []
        };
      }

      shopPayments[shopId].items.push({
        _key: `${cartItem._id}_${Date.now()}`,
        foodName: sanityItem.foodName,
        quantity: cartItem.quantity,
        price: sanityItem.price,
        shopName: sanityItem.shopName,
      });

      shopPayments[shopId].amount += itemTotal;
      totalAmount += itemTotal;
    }

    // Create Razorpay order with transfers to each shop
    const transfers = Object.values(shopPayments).map(shop => ({
      account: shop.razorpayAccountId,
      amount: Math.round(shop.amount * 100), // Convert to paise
      currency: 'INR',
      notes: {
        shopId: shop.shopId,
        shopName: shop.shopName,
        transferType: 'vendor_payment'
      }
    }));

    const razorpayOrderOptions = {
      amount: Math.round(totalAmount * 100), // Convert to paise
      currency: 'INR',
      receipt: `wedine_${Date.now()}`,
      notes: {
        userId: userDetails.userId,
        userEmail: userDetails.email,
        orderType: 'multi_vendor_food_order'
      },
      transfers: transfers
    };

    const razorpayOrder = await razorpay.orders.create(razorpayOrderOptions);

    // Create temporary order records for tracking
    const now = new Date().toISOString();
    const createdOrders = [];

    for (const [shopId, shopPayment] of Object.entries(shopPayments)) {
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const orderIdentifier = `ONLINE-${timestamp}-${shopId.slice(-6)}-${randomSuffix}`;

      // Create pending order document
      const orderDoc = {
        _type: 'order',
        userId: userDetails.userId,
        userEmail: userDetails.email,
        orderIdentifier,
        items: shopPayment.items,
        total: shopPayment.amount,
        paymentMethod: 'online',
        orderStatus: false, // Will be updated after payment verification
        status: 'payment_pending',
        paymentStatus: false,
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isArchived: false,
        // Store Razorpay order details
        paymentDetails: {
          razorpayOrderId: razorpayOrder.id,
          razorpayAccountId: shopPayment.razorpayAccountId,
          paymentStatus: 'pending',
          transferAmount: shopPayment.amount
        },
        // Include user details for delivery
        userDetails: {
          name: userDetails.name,
          phone: userDetails.phone,
          address: userDetails.address
        }
      };

      const createdOrder = await writeClient.create(orderDoc);
      createdOrders.push({
        orderId: createdOrder._id,
        orderIdentifier,
        shopName: shopPayment.shopName,
        amount: shopPayment.amount,
        razorpayAccountId: shopPayment.razorpayAccountId
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Razorpay order created successfully',
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orders: createdOrders,
      totalAmount,
      orderCount: createdOrders.length,
      // Client-side payment options
      paymentOptions: {
        key: process.env.RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        order_id: razorpayOrder.id,
        name: 'WeDine',
        description: 'Food delivery payment',
        prefill: {
          name: userDetails.name || '',
          email: userDetails.email || '',
          contact: userDetails.phone || ''
        },
        notes: {
          orderType: 'multi_vendor_food_order',
          userId: userDetails.userId
        },
        theme: {
          color: '#F59E0B'
        }
      }
    });

  } catch (error) {
    console.error('[FATAL] Create Online Order Failed:', error);
    return NextResponse.json({ 
      error: 'Failed to create online order',
      details: (error as Error).message || 'An unknown server error occurred' 
    }, { status: 500 });
  }
}