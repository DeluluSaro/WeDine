# WeDine Backend API Documentation

This document provides comprehensive documentation for all the backend API endpoints that interact with Sanity CMS.

## Table of Contents

1. [Food Items API](#food-items-api)
2. [Shops API](#shops-api)
3. [Orders API](#orders-api)
4. [Reviews API](#reviews-api)
5. [Admin API](#admin-api)
6. [Cart API](#cart-api)
7. [Utilities API](#utilities-api)
8. [Analytics API](#analytics-api)

## Food Items API

### GET /api/food-items
Fetches food items with optional filtering.

**Query Parameters:**
- `shopId` (optional): Filter by shop ID
- `category` (optional): Filter by category
- `search` (optional): Search in food name and description
- `limit` (optional): Number of items to return (default: 50)
- `offset` (optional): Number of items to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "foodItems": [...],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

### POST /api/food-items
Creates a new food item.

**Request Body:**
```json
{
  "foodName": "Pizza Margherita",
  "shopRef": "shop_id_here",
  "price": 299,
  "category": "Italian",
  "description": "Classic Italian pizza",
  "ingredients": ["tomato", "mozzarella", "basil"],
  "isVegetarian": true,
  "isVegan": false
}
```

### GET /api/food-items/[id]
Fetches a specific food item by ID.

### PUT /api/food-items/[id]
Updates a specific food item.

### DELETE /api/food-items/[id]
Deletes a specific food item (only if not in active carts).

## Shops API

### GET /api/shops
Fetches shops with optional filtering.

**Query Parameters:**
- `search` (optional): Search in shop name and description
- `location` (optional): Filter by location
- `limit` (optional): Number of items to return (default: 50)
- `offset` (optional): Number of items to skip (default: 0)

### POST /api/shops
Creates a new shop.

**Request Body:**
```json
{
  "shopName": "Mario's Pizza",
  "description": "Authentic Italian cuisine",
  "location": "Downtown",
  "contactInfo": {
    "phone": "+1234567890",
    "email": "mario@example.com"
  },
  "operatingHours": {
    "monday": "9:00-22:00",
    "tuesday": "9:00-22:00"
  }
}
```

### GET /api/shops/[id]
Fetches a specific shop by ID with its food items.

### PUT /api/shops/[id]
Updates a specific shop.

### DELETE /api/shops/[id]
Deletes a specific shop (only if no food items exist).

## Orders API

### GET /api/orders
Fetches user orders from order history.

**Query Parameters:**
- `userId` (required): User ID
- `type` (optional): 'active' or 'history' (default: 'active')

### POST /api/orders/create
Creates a new order.

**Request Body:**
```json
{
  "userId": "user_123",
  "userEmail": "user@example.com",
  "items": [
    {
      "foodName": "Pizza Margherita",
      "quantity": 2,
      "price": 299,
      "shopName": "Mario's Pizza"
    }
  ],
  "total": 598,
  "paymentMethod": "cod"
}
```

### PUT /api/orders/update-status
Updates order status.

**Request Body:**
```json
{
  "orderId": "order_123",
  "status": "preparing",
  "paymentStatus": true,
  "paymentDetails": {
    "razorpayOrderId": "order_xyz",
    "razorpayPaymentId": "pay_abc",
    "paymentStatus": "success"
  }
}
```

### PUT /api/orders/bulk-update
Updates multiple orders at once.

**Request Body:**
```json
{
  "updates": [
    {
      "orderId": "order_1",
      "status": "delivered"
    },
    {
      "orderId": "order_2",
      "status": "cancelled"
    }
  ]
}
```

## Reviews API

### GET /api/reviews
Fetches reviews with optional filtering.

**Query Parameters:**
- `foodItemId` (optional): Filter by food item ID
- `shopId` (optional): Filter by shop ID
- `userId` (optional): Filter by user ID
- `rating` (optional): Filter by minimum rating
- `limit` (optional): Number of items to return (default: 50)
- `offset` (optional): Number of items to skip (default: 0)

### POST /api/reviews
Creates a new review.

**Request Body:**
```json
{
  "userId": "user_123",
  "userName": "John Doe",
  "foodItemId": "food_123",
  "shopId": "shop_123",
  "rating": 5,
  "comment": "Excellent pizza!"
}
```

### POST /api/reviews/helpful
Marks a review as helpful or unhelpful.

**Request Body:**
```json
{
  "reviewId": "review_123",
  "userId": "user_123",
  "isHelpful": true
}
```

## Admin API

### GET /api/admin/credentials
Fetches admin credentials.

**Query Parameters:**
- `username` (required): Admin username

### POST /api/admin/credentials
Creates new admin credentials.

**Request Body:**
```json
{
  "username": "admin",
  "password": "secure_password",
  "isActive": true
}
```

### PUT /api/admin/credentials
Updates admin credentials.

### DELETE /api/admin/credentials
Deletes admin credentials.

## Cart API

### GET /api/cart
Fetches user's cart items.

**Query Parameters:**
- `userId` (required): User ID

### POST /api/cart
Adds item to cart or updates quantity.

**Request Body:**
```json
{
  "userId": "user_123",
  "foodId": "food_123",
  "quantity": 2,
  "price": 299
}
```

### PATCH /api/cart
Decrements quantity or removes item.

**Request Body:**
```json
{
  "cartItemId": "cart_item_123"
}
```

### DELETE /api/cart
Removes item from cart.

**Query Parameters:**
- `cartItemId` (required): Cart item ID

### POST /api/cart/clear
Clears entire cart for a user.

**Request Body:**
```json
{
  "userId": "user_123"
}
```

## Utilities API

### POST /api/utilities/cleanup
Performs various cleanup operations.

**Request Body:**
```json
{
  "operations": [
    {
      "type": "cleanup-expired-orders"
    },
    {
      "type": "cleanup-empty-carts"
    },
    {
      "type": "archive-completed-orders"
    },
    {
      "type": "cleanup-orphaned-cart-items"
    },
    {
      "type": "update-food-ratings"
    },
    {
      "type": "cleanup-old-reviews",
      "daysOld": 365
    }
  ]
}
```

### GET /api/utilities/export
Exports data from Sanity CMS.

**Query Parameters:**
- `type` (optional): Type of data to export (foodItems, shops, orders, reviews, all)
- `format` (optional): Export format (json, csv)
- `dateFrom` (optional): Start date for filtering
- `dateTo` (optional): End date for filtering

## Analytics API

### GET /api/analytics/dashboard
Provides comprehensive analytics data.

**Query Parameters:**
- `period` (optional): Time period (7d, 30d, 90d, 1y, all)
- `shopId` (optional): Filter by specific shop

**Response:**
```json
{
  "success": true,
  "analytics": {
    "period": "30d",
    "overview": {
      "totalOrders": 150,
      "totalRevenue": 45000,
      "averageOrderValue": 300,
      "totalFoodItems": 50,
      "totalReviews": 75,
      "averageRating": 4.2,
      "activeUsers": 25
    },
    "orders": {
      "totalOrders": 150,
      "completedOrders": 120,
      "cancelledOrders": 10,
      "pendingOrders": 20,
      "completionRate": 80,
      "cancellationRate": 6.67
    },
    "revenue": {
      "totalRevenue": 45000,
      "averageOrderValue": 300,
      "dailyRevenue": [...]
    },
    "topFoodItems": [...],
    "topShops": [...],
    "recentOrders": [...],
    "distributions": {
      "orderStatus": [...],
      "paymentMethod": [...]
    }
  }
}
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (missing or invalid parameters)
- `404`: Not Found
- `500`: Internal Server Error

## Authentication

Most endpoints require proper authentication. Admin endpoints require admin credentials. Some endpoints may require user authentication through Clerk.

## Rate Limiting

Consider implementing rate limiting for production use to prevent abuse.

## Data Validation

All endpoints include proper data validation and sanitization. Required fields are validated, and data types are checked before processing.

## Sanity CMS Integration

All endpoints interact with Sanity CMS using the configured client. Write operations require proper authentication tokens, while read operations can use CDN for better performance.

