/**
 * Order Lifecycle Management Utilities
 * 
 * This file contains utility functions for managing the dual schema system:
 * - Orders schema (temporary, 24-hour lifecycle)
 * - OrderHistory schema (permanent storage)
 */

export interface OrderLifecycleConfig {
  retentionHours: number;
  cleanupIntervalMinutes: number;
}

export const DEFAULT_CONFIG: OrderLifecycleConfig = {
  retentionHours: 24,
  cleanupIntervalMinutes: 60, // Run cleanup every hour
};

/**
 * Calculate when an order should expire
 */
export function calculateExpiryDate(createdAt: Date, retentionHours: number = 24): Date {
  return new Date(createdAt.getTime() + retentionHours * 60 * 60 * 1000);
}

/**
 * Check if an order has expired
 */
export function isOrderExpired(createdAt: Date, retentionHours: number = 24): boolean {
  const expiryDate = calculateExpiryDate(createdAt, retentionHours);
  return new Date() > expiryDate;
}

/**
 * Get orders that are ready for cleanup
 */
export function getExpiredOrdersQuery(retentionHours: number = 24): string {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - retentionHours);
  
  return `*[_type == "order" && createdAt < $cutoffDate && isArchived != true] {
    _id,
    userId,
    orderId,
    userEmail,
    foodId,
    foodName,
    shopName,
    quantityOrdered,
    items,
    total,
    paymentMethod,
    status,
    createdAt,
    updatedAt,
    paymentStatus,
    expiresAt
  }`;
}

/**
 * Create history record from order
 */
export function createHistoryRecord(order: any, archivedAt: Date): any {
  return {
    _type: 'orderHistory',
    userId: order.userId,
    orderId: order.orderId,
    userEmail: order.userEmail,
    foodId: order.foodId,
    foodName: order.foodName,
    shopName: order.shopName,
    quantityOrdered: order.quantityOrdered,
    items: order.items,
    total: order.total,
    paymentMethod: order.paymentMethod,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    paymentStatus: order.paymentStatus,
    archivedAt: archivedAt.toISOString(),
    originalOrderId: order._id,
    lifecycleNotes: `Automatically archived after ${DEFAULT_CONFIG.retentionHours} hours on ${archivedAt.toISOString()}`
  };
}

/**
 * Get cleanup statistics
 */
export function getCleanupStatsQuery(): string {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - DEFAULT_CONFIG.retentionHours);
  
  return `
    {
      "expiredOrders": count(*[_type == "order" && createdAt < $cutoffDate && isArchived != true]),
      "activeOrders": count(*[_type == "order" && isArchived != true]),
      "historyRecords": count(*[_type == "orderHistory"]),
      "archivedOrders": count(*[_type == "order" && isArchived == true])
    }
  `;
}

/**
 * Validate order data for history creation
 */
export function validateOrderForHistory(order: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!order._id) errors.push('Missing order ID');
  if (!order.userId) errors.push('Missing user ID');
  if (!order.total) errors.push('Missing total amount');
  if (!order.createdAt) errors.push('Missing creation date');
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Duplicate order prevention utilities
export interface DuplicateOrderCheck {
  orderId: string;
  createdAt: string;
  total: number;
  message: string;
}

/**
 * Generate a unique order identifier to help prevent duplicates
 * @param userId - User ID
 * @param cartItems - Cart items
 * @param timestamp - Order timestamp
 * @returns Unique order identifier
 */
export function generateOrderIdentifier(
  userId: string, 
  cartItems: any[], 
  timestamp: number
): string {
  const itemHash = cartItems
    .map(item => `${item.foodId?.foodName || item.foodName}-${item.quantity}`)
    .sort()
    .join('|');
  
  return `${userId}_${itemHash}_${timestamp}`;
}

/**
 * Safely handle order identifier to prevent React DOM errors
 * @param orderIdentifier - The order identifier to sanitize
 * @returns A safe version of the order identifier
 */
export function sanitizeOrderIdentifier(orderIdentifier: string): string {
  if (!orderIdentifier) return 'unknown-order';
  
  // Remove any characters that could be interpreted as React element names
  return orderIdentifier
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .replace(/-+/g, '-')
    .toLowerCase();
}

/**
 * Safely handle food names to prevent React DOM errors
 * @param foodName - The food name to sanitize
 * @returns A safe version of the food name
 */
export function sanitizeFoodName(foodName: string): string {
  if (!foodName) return 'unknown-food';
  
  // Remove any characters that could be interpreted as React element names
  return foodName
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .replace(/-+/g, '-')
    .toLowerCase();
}

/**
 * Generate a unique order identifier with additional entropy
 * @param userId - User ID
 * @param cartItems - Cart items
 * @param paymentMethod - Payment method
 * @returns Unique order identifier with entropy
 */
export function generateUniqueOrderIdentifier(
  userId: string, 
  cartItems: any[], 
  paymentMethod: 'cod' | 'online'
): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  // Sanitize item names to prevent invalid characters
  const itemHash = cartItems
    .map(item => {
      const foodName = item.foodId?.foodName || item.foodName || 'unknown';
      // Use sanitized food name to prevent React component name issues
      const sanitizedName = sanitizeFoodName(foodName);
      
      // Ensure it doesn't start with a number
      const finalName = /^\d/.test(sanitizedName) ? `item-${sanitizedName}` : sanitizedName;
      
      return `${finalName}-${item.quantity}`;
    })
    .sort()
    .join('|');
  
  // Ensure the final identifier is safe for use in React
  const safeUserId = userId.replace(/[^a-zA-Z0-9-]/g, '-');
  const safePaymentMethod = paymentMethod.replace(/[^a-zA-Z0-9-]/g, '-');
  
  return `order-${safeUserId}-${safePaymentMethod}-${itemHash}-${timestamp}-${randomSuffix}`;
}

/**
 * Check for duplicate orders within a time window using Sanity client
 * @param userId - User ID to check
 * @param cartItems - Cart items to compare
 * @param paymentMethod - Payment method used
 * @param timeWindowMinutes - Time window in minutes (default: 2 for dev, 5 for prod)
 * @returns DuplicateOrderCheck object if duplicate found, null otherwise
 */
export async function checkForDuplicateOrder(
  userId: string, 
  cartItems: any[], 
  paymentMethod: 'cod' | 'online',
  timeWindowMinutes?: number
): Promise<DuplicateOrderCheck | null> {
  const timeWindow = timeWindowMinutes || (process.env.NODE_ENV === 'development' ? 2 : 5);
  const timeWindowMs = timeWindow * 60 * 1000;
  
  const cutoffTime = new Date(Date.now() - timeWindowMs).toISOString();
  
  try {
    // Import Sanity client dynamically to avoid circular dependencies
    const { client } = await import('@/sanity/lib/client');
    
    // Query for recent orders with same user and payment method
    const recentOrders = await client.fetch(`
      *[_type == "order" && userId == $userId && createdAt >= $cutoffTime && paymentMethod == $paymentMethod] {
        _id,
        createdAt,
        items,
        total,
        paymentStatus,
        orderStatus,
        orderIdentifier
      } | order(createdAt desc)
    `, { 
      userId, 
      cutoffTime, 
      paymentMethod 
    });

    if (recentOrders.length === 0) {
      return null;
    }

    // Check if any recent order has similar items
    for (const order of recentOrders) {
      const orderItemNames = order.items?.map((item: any) => item.foodName).sort() || [];
      const cartItemNames = cartItems.map(item => item.foodId?.foodName || item.foodName).sort();
      
      // Check if items are similar (same food names)
      if (JSON.stringify(orderItemNames) === JSON.stringify(cartItemNames)) {
        return {
          orderId: order._id,
          createdAt: order.createdAt,
          total: order.total,
          message: `Duplicate order detected. You placed a similar order ${timeWindow} minutes ago.`
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error checking for duplicate orders:', error);
    return null;
  }
}

/**
 * Check for existing pending orders that should be cleaned up
 * @param userId - User ID to check
 * @returns Array of pending orders that should be cleaned up
 */
export async function findPendingOrdersToCleanup(userId: string): Promise<any[]> {
  try {
    const { client } = await import('@/sanity/lib/client');
    
    const cutoffTime = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 minutes ago
    
    const pendingOrders = await client.fetch(`
      *[_type == "order" && userId == $userId && paymentStatus == false && isArchived == false && createdAt < $cutoffTime] {
        _id,
        createdAt,
        items,
        orderIdentifier
      }
    `, { userId, cutoffTime });

    return pendingOrders;
  } catch (error) {
    console.error('Error finding pending orders to cleanup:', error);
    return [];
  }
}

/**
 * Validate order data to prevent invalid submissions
 * @param orderData - Order data to validate
 * @returns Validation result
 */
export function validateOrderData(orderData: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!orderData.userId) {
    errors.push('User ID is required');
  }
  
  if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
    errors.push('Order items are required and must be a non-empty array');
  }
  
  if (!orderData.paymentMethod || !['cod', 'online'].includes(orderData.paymentMethod)) {
    errors.push('Valid payment method is required (cod or online)');
  }
  
  if (typeof orderData.total !== 'number' || orderData.total <= 0) {
    errors.push('Valid total amount is required');
  }
  
  if (!orderData.orderIdentifier) {
    errors.push('Order identifier is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}