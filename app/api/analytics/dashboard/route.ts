import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';

/**
 * GET /api/analytics/dashboard
 * Provides comprehensive analytics data for the dashboard
 * 
 * Query Params:
 * - period: Time period (7d, 30d, 90d, 1y, all)
 * - shopId: Filter by specific shop
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30d';
    const shopId = searchParams.get('shopId');

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0); // All time
    }

    const dateFilter = ` && _createdAt >= $startDate`;
    const params: any = { startDate: startDate.toISOString() };

    if (shopId) {
      params.shopId = shopId;
    }

    // Fetch all analytics data in parallel
    const [
      orderStats,
      revenueStats,
      foodItemStats,
      reviewStats,
      userStats,
      topFoodItems,
      topShops,
      recentOrders,
      orderStatusDistribution,
      paymentMethodDistribution
    ] = await Promise.all([
      getOrderStats(dateFilter, params),
      getRevenueStats(dateFilter, params),
      getFoodItemStats(dateFilter, params),
      getReviewStats(dateFilter, params),
      getUserStats(dateFilter, params),
      getTopFoodItems(dateFilter, params),
      getTopShops(dateFilter, params),
      getRecentOrders(dateFilter, params),
      getOrderStatusDistribution(dateFilter, params),
      getPaymentMethodDistribution(dateFilter, params)
    ]);

    const analytics = {
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString()
      },
      overview: {
        totalOrders: orderStats.totalOrders,
        totalRevenue: revenueStats.totalRevenue,
        averageOrderValue: revenueStats.averageOrderValue,
        totalFoodItems: foodItemStats.totalFoodItems,
        totalReviews: reviewStats.totalReviews,
        averageRating: reviewStats.averageRating,
        activeUsers: userStats.activeUsers
      },
      orders: orderStats,
      revenue: revenueStats,
      foodItems: foodItemStats,
      reviews: reviewStats,
      users: userStats,
      topFoodItems,
      topShops,
      recentOrders,
      distributions: {
        orderStatus: orderStatusDistribution,
        paymentMethod: paymentMethodDistribution
      }
    };

    return NextResponse.json({
      success: true,
      analytics
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Analytics fetch error:', err);
    return NextResponse.json({ 
      error: 'Failed to fetch analytics data',
      details: err.message 
    }, { status: 500 });
  }
}

// Helper functions for analytics

async function getOrderStats(dateFilter: string, params: any) {
  const orders = await client.fetch(
    `*[_type == "order"${dateFilter}] {
      _id,
      total,
      status,
      createdAt,
      paymentStatus
    }`,
    params
  );

  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'delivered').length;
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
  const pendingOrders = orders.filter(o => ['ordered', 'order accepted', 'preparing', 'out for delivery'].includes(o.status)).length;

  return {
    totalOrders,
    completedOrders,
    cancelledOrders,
    pendingOrders,
    completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
    cancellationRate: totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0
  };
}

async function getRevenueStats(dateFilter: string, params: any) {
  const orders = await client.fetch(
    `*[_type == "order"${dateFilter} && status == "delivered"] {
      total,
      createdAt
    }`,
    params
  );

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  // Daily revenue for chart data
  const dailyRevenue = orders.reduce((acc, order) => {
    const date = new Date(order.createdAt).toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + order.total;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalRevenue,
    averageOrderValue,
    dailyRevenue: Object.entries(dailyRevenue).map(([date, revenue]) => ({ date, revenue }))
  };
}

async function getFoodItemStats(dateFilter: string, params: any) {
  const foodItems = await client.fetch(
    `*[_type == "foodItem"${dateFilter}] {
      _id,
      rating,
      reviews,
      price,
      category
    }`,
    params
  );

  const totalFoodItems = foodItems.length;
  const averageRating = foodItems.length > 0 
    ? foodItems.reduce((sum, item) => sum + (item.rating || 0), 0) / foodItems.length 
    : 0;

  const categoryDistribution = foodItems.reduce((acc, item) => {
    const category = item.category || 'Uncategorized';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalFoodItems,
    averageRating,
    categoryDistribution: Object.entries(categoryDistribution).map(([category, count]) => ({ category, count }))
  };
}

async function getReviewStats(dateFilter: string, params: any) {
  const reviews = await client.fetch(
    `*[_type == "review"${dateFilter}] {
      rating,
      helpfulVotes,
      createdAt
    }`,
    params
  );

  const totalReviews = reviews.length;
  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  const totalHelpfulVotes = reviews.reduce((sum, review) => sum + review.helpfulVotes, 0);

  return {
    totalReviews,
    averageRating,
    totalHelpfulVotes
  };
}

async function getUserStats(dateFilter: string, params: any) {
  const orders = await client.fetch(
    `*[_type == "order"${dateFilter}] {
      userId
    }`,
    params
  );

  const uniqueUsers = new Set(orders.map(order => order.userId));
  const activeUsers = uniqueUsers.size;

  return {
    activeUsers
  };
}

async function getTopFoodItems(dateFilter: string, params: any) {
  const foodItems = await client.fetch(
    `*[_type == "foodItem"${dateFilter}] {
      _id,
      foodName,
      rating,
      reviews,
      price,
      shopRef->{
        shopName
      }
    } | order(rating desc, reviews desc) [0...10]`,
    params
  );

  return foodItems;
}

async function getTopShops(dateFilter: string, params: any) {
  const shops = await client.fetch(
    `*[_type == "shop"${dateFilter}] {
      _id,
      shopName,
      rating,
      totalReviews,
      "orderCount": count(*[_type == "order" && items[0].shopName == shopName]),
      "totalRevenue": sum(*[_type == "order" && items[0].shopName == shopName && status == "delivered"].total)
    } | order(orderCount desc) [0...10]`,
    params
  );

  return shops;
}

async function getRecentOrders(dateFilter: string, params: any) {
  const orders = await client.fetch(
    `*[_type == "order"${dateFilter}] | order(createdAt desc) [0...10] {
      _id,
      orderIdentifier,
      total,
      status,
      createdAt,
      items[0].shopName
    }`,
    params
  );

  return orders;
}

async function getOrderStatusDistribution(dateFilter: string, params: any) {
  const orders = await client.fetch(
    `*[_type == "order"${dateFilter}] {
      status
    }`,
    params
  );

  const distribution = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(distribution).map(([status, count]) => ({ status, count }));
}

async function getPaymentMethodDistribution(dateFilter: string, params: any) {
  const orders = await client.fetch(
    `*[_type == "order"${dateFilter}] {
      paymentMethod
    }`,
    params
  );

  const distribution = orders.reduce((acc, order) => {
    acc[order.paymentMethod] = (acc[order.paymentMethod] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(distribution).map(([method, count]) => ({ method, count }));
}

