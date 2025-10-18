/**
 * Order ID Generator
 * Generates unique 5-character order IDs for easy user memorization
 */

// Characters to use for order IDs (excluding confusing characters like 0, O, I, 1)
const ORDER_ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generates a unique 5-character order ID
 * @returns A 5-character string using letters and numbers (excluding confusing characters)
 */
export function generateOrderId(): string {
  let orderId = '';
  
  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * ORDER_ID_CHARS.length);
    orderId += ORDER_ID_CHARS[randomIndex];
  }
  
  return orderId;
}

/**
 * Validates if a string is a valid order ID format
 * @param orderId - The order ID to validate
 * @returns true if valid format, false otherwise
 */
export function isValidOrderId(orderId: string): boolean {
  if (!orderId || orderId.length !== 5) {
    return false;
  }
  
  // Check if all characters are from our allowed set
  for (const char of orderId) {
    if (!ORDER_ID_CHARS.includes(char.toUpperCase())) {
      return false;
    }
  }
  
  return true;
}

/**
 * Formats an order ID for display (uppercase)
 * @param orderId - The order ID to format
 * @returns Formatted order ID
 */
export function formatOrderId(orderId: string): string {
  return orderId.toUpperCase();
}



