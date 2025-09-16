import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';

// Define types for clarity and safety
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
    }
  };
}

interface UserDetails {
  userId: string;
  email?: string;
  name?: string;
  phone?: string;
  address?: string;
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

    // --- Server-side price calculation and data preparation ---
    const itemIds = cartItems.map(item => item.foodId._id);
    const sanityQuery = `*[_type == "foodItem" && _id in $itemIds]{
      _id, 
      price, 
      foodName,
      quantity,
      "shopName": shopRef->shopName,
      "shopId": shopRef->_id
    }`;
    const sanityItems: any[] = await client.fetch(sanityQuery, { itemIds });
    const sanityItemsMap = new Map(sanityItems.map(item => [item._id, item]));

    // --- STOCK VALIDATION CHECKPOINT ---
    console.log('🔍 Validating stock for COD order...');
    const stockValidationErrors = [];
    
    for (const cartItem of cartItems) {
      const sanityItem = sanityItemsMap.get(cartItem.foodId._id);
      if (!sanityItem) {
        throw new Error(`Item ${cartItem.foodId.foodName} not found in database`);
      }
      
      // Check stock if quantity is managed
      if (sanityItem.quantity !== null && sanityItem.quantity !== undefined) {
        if (cartItem.quantity > sanityItem.quantity) {
          stockValidationErrors.push(
            `${sanityItem.foodName}: Requested ${cartItem.quantity}, but only ${sanityItem.quantity} available`
          );
        }
      }
    }
    
    // Return error if any items have insufficient stock
    if (stockValidationErrors.length > 0) {
      console.log('❌ Stock validation failed:', stockValidationErrors);
      return NextResponse.json({
        error: 'Insufficient stock for some items',
        details: stockValidationErrors,
        insufficientStock: true
      }, { status: 400 });
    }
    
    console.log('✅ Stock validation passed - processing COD order');

    // Group items by shop for separate orders
    const shopOrders: { [shopId: string]: any } = {};

    for (const cartItem of cartItems) {
      const sanityItem = sanityItemsMap.get(cartItem.foodId._id);
      if (!sanityItem) {
        throw new Error(`Item ${cartItem.foodId.foodName} not found in database`);
      }
      
      const shopId = sanityItem.shopId;
      const itemTotal = sanityItem.price * cartItem.quantity;

      if (!shopOrders[shopId]) {
        shopOrders[shopId] = {
          shopId,
          shopName: sanityItem.shopName,
          items: [],
          total: 0
        };
      }

      shopOrders[shopId].items.push({
        _key: `${cartItem._id}_${Date.now()}`,
        foodName: sanityItem.foodName,
        quantity: cartItem.quantity,
        price: sanityItem.price,
        shopName: sanityItem.shopName,
      });

      shopOrders[shopId].total += itemTotal;
    }

    const createdOrders = [];
    const now = new Date().toISOString();

    // Create separate orders for each shop
    for (const [shopId, shopOrder] of Object.entries(shopOrders)) {
      // Generate unique order identifier for each shop
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const orderIdentifier = `COD-${timestamp}-${shopId.slice(-6)}-${randomSuffix}`;

      // Create order document
      const orderDoc = {
        _type: 'order',
        userId: userDetails.userId,
        userEmail: userDetails.email,
        orderIdentifier,
        items: shopOrder.items,
        total: shopOrder.total,
        paymentMethod: 'cod',
        orderStatus: false, // COD is not paid online
        status: 'ordered',
        paymentStatus: false,
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isArchived: false,
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
        shopName: shopOrder.shopName,
        total: shopOrder.total,
        items: shopOrder.items
      });
    }

    const totalAmount = Object.values(shopOrders).reduce((sum, order) => sum + order.total, 0);

    // --- REDUCE STOCK for all ordered items ---
    console.log('📦 Reducing stock for ordered items...');
    for (const cartItem of cartItems) {
      const sanityItem = sanityItemsMap.get(cartItem.foodId._id);
      if (sanityItem && sanityItem.quantity !== null && sanityItem.quantity !== undefined) {
        const newQuantity = Math.max(0, sanityItem.quantity - cartItem.quantity);
        console.log(`📉 Reducing ${sanityItem.foodName} stock: ${sanityItem.quantity} -> ${newQuantity}`);
        
        try {
          await writeClient
            .patch(cartItem.foodId._id)
            .set({ quantity: newQuantity })
            .commit();
        } catch (stockError) {
          console.error(`Failed to reduce stock for ${sanityItem.foodName}:`, stockError);
          // Continue with other items even if one fails
        }
      }
    }
    console.log('✅ Stock reduction completed');

    return NextResponse.json({
      success: true,
      message: 'COD orders created successfully',
      orders: createdOrders,
      totalAmount,
      orderCount: createdOrders.length
    });

  } catch (error) {
    console.error('[FATAL] Create COD Order Failed:', error);
    return NextResponse.json({ 
      error: 'Failed to create COD orders',
      details: (error as Error).message || 'An unknown server error occurred' 
    }, { status: 500 });
  }
}