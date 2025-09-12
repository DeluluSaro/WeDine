import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';

/**
 * GET /api/utilities/export
 * Exports data from Sanity CMS
 * 
 * Query Params:
 * - type: Type of data to export (foodItems, shops, orders, reviews, all)
 * - format: Export format (json, csv)
 * - dateFrom: Start date for date range filtering
 * - dateTo: End date for date range filtering
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';
    const format = searchParams.get('format') || 'json';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let data: any = {};

    // Build date filter
    let dateFilter = '';
    if (dateFrom && dateTo) {
      dateFilter = ` && _createdAt >= $dateFrom && _createdAt <= $dateTo`;
    }

    const params: any = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;

    if (type === 'all' || type === 'foodItems') {
      data.foodItems = await client.fetch(
        `*[_type == "foodItem"${dateFilter}] {
          _id,
          foodName,
          price,
          category,
          foodType,
          description,
          ingredients,
          allergens,
          preparationTime,
          rating,
          reviews,
          spicyLevel,
          isVegetarian,
          isVegan,
          calories,
          protein,
          carbs,
          fat,
          quantity,
          _createdAt,
          _updatedAt,
          shopRef->{
            _id,
            shopName,
            location
          }
        }`,
        params
      );
    }

    if (type === 'all' || type === 'shops') {
      data.shops = await client.fetch(
        `*[_type == "shop"${dateFilter}] {
          _id,
          shopName,
          description,
          location,
          contactInfo,
          operatingHours,
          rating,
          totalReviews,
          isActive,
          _createdAt,
          _updatedAt
        }`,
        params
      );
    }

    if (type === 'all' || type === 'orders') {
      data.orders = await client.fetch(
        `*[_type == "order"${dateFilter}] {
          _id,
          userId,
          userEmail,
          orderIdentifier,
          items,
          total,
          paymentMethod,
          orderStatus,
          status,
          paymentStatus,
          createdAt,
          updatedAt,
          expiresAt,
          isArchived,
          archivedAt,
          paymentDetails
        }`,
        params
      );
    }

    if (type === 'all' || type === 'orderHistory') {
      data.orderHistory = await client.fetch(
        `*[_type == "orderHistory"${dateFilter}] {
          _id,
          userId,
          userEmail,
          orderIdentifier,
          items,
          total,
          paymentMethod,
          status,
          createdAt,
          updatedAt,
          archivedAt,
          paymentStatus,
          originalOrderId,
          lifecycleNotes,
          paymentDetails
        }`,
        params
      );
    }

    if (type === 'all' || type === 'reviews') {
      data.reviews = await client.fetch(
        `*[_type == "review"${dateFilter}] {
          _id,
          userId,
          userName,
          rating,
          comment,
          helpfulVotes,
          createdAt,
          foodItem->{
            _id,
            foodName
          },
          shop->{
            _id,
            shopName
          }
        }`,
        params
      );
    }

    if (type === 'all' || type === 'cartItems') {
      data.cartItems = await client.fetch(
        `*[_type == "cartItem"${dateFilter}] {
          _id,
          userId,
          quantity,
          price,
          createdAt,
          foodId->{
            _id,
            foodName,
            shopRef->{
              _id,
              shopName
            }
          }
        }`,
        params
      );
    }

    if (type === 'all' || type === 'adminCredentials') {
      data.adminCredentials = await client.fetch(
        `*[_type == "adminCredentials"${dateFilter}] {
          _id,
          username,
          isActive,
          createdAt,
          lastLogin
        }`,
        params
      );
    }

    // Add metadata
    data.metadata = {
      exportDate: new Date().toISOString(),
      type,
      format,
      dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : null,
      recordCounts: {
        foodItems: data.foodItems?.length || 0,
        shops: data.shops?.length || 0,
        orders: data.orders?.length || 0,
        orderHistory: data.orderHistory?.length || 0,
        reviews: data.reviews?.length || 0,
        cartItems: data.cartItems?.length || 0,
        adminCredentials: data.adminCredentials?.length || 0
      }
    };

    if (format === 'csv') {
      // Convert to CSV format (simplified - would need proper CSV library for complex data)
      const csvData = convertToCSV(data);
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="wedine-export-${type}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Data export error:', err);
    return NextResponse.json({ 
      error: 'Failed to export data',
      details: err.message 
    }, { status: 500 });
  }
}

// Helper function to convert data to CSV (simplified)
function convertToCSV(data: any): string {
  const lines: string[] = [];
  
  // Add metadata
  lines.push('Export Metadata');
  lines.push(`Export Date,${data.metadata.exportDate}`);
  lines.push(`Type,${data.metadata.type}`);
  lines.push(`Format,${data.metadata.format}`);
  lines.push('');

  // Convert each data type to CSV
  Object.keys(data).forEach(key => {
    if (key === 'metadata') return;
    
    const items = data[key];
    if (!Array.isArray(items) || items.length === 0) return;

    lines.push(`${key.toUpperCase()}`);
    lines.push('');

    // Get all unique keys from all items
    const allKeys = new Set();
    items.forEach((item: any) => {
      Object.keys(item).forEach(key => allKeys.add(key));
    });

    const headers = Array.from(allKeys);
    lines.push(headers.join(','));

    // Add data rows
    items.forEach((item: any) => {
      const row = headers.map(header => {
        const value = item[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value).replace(/,/g, ';'); // Replace commas to avoid CSV issues
      });
      lines.push(row.join(','));
    });

    lines.push('');
  });

  return lines.join('\n');
}

