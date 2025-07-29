# Dual Schema Orders Management System

## Overview

This document describes the implementation of a dual schema system for orders management with automatic data lifecycle management. The system consists of two schemas:

1. **Orders Schema** (Temporary - 24 Hour Lifecycle)
2. **OrderHistory Schema** (Permanent Storage)

## Architecture

### Data Flow

```
New Order Created → 
├── Insert into Orders Schema (temporary)
└── Insert into History Schema (permanent)

After 24 Hours →
├── Delete from Orders Schema (auto-cleanup)
└── Keep in History Schema (permanent)
```

## Schema Definitions

### 1. Orders Schema (`order`)

**Purpose**: Temporary storage for active/pending orders
**Retention**: 24 hours maximum
**Auto-cleanup**: Automatically cleared after 1 day

**Key Fields**:
- `expiresAt`: When the order will be automatically archived
- `isArchived`: Whether the order has been moved to history
- `archivedAt`: When the order was moved to history

### 2. OrderHistory Schema (`orderHistory`)

**Purpose**: Permanent storage for all order history
**Retention**: Indefinite (never delete)
**Content**: Complete order history for reference and analytics

**Key Fields**:
- `archivedAt`: When the order was moved from active to history
- `originalOrderId`: Reference to the original order document
- `lifecycleNotes`: Notes about the order lifecycle

## API Endpoints

### 1. Orders API (`/api/orders`)

**POST**: Create new order
- Creates order in both schemas simultaneously
- Sets expiry date for automatic cleanup

**GET**: Fetch orders
- `?type=active`: Fetch from Orders schema (active orders)
- `?type=history`: Fetch from OrderHistory schema (historical data)

### 2. Cleanup API (`/api/orders/cleanup`)

**POST**: Perform cleanup
- Finds orders older than 24 hours
- Moves them to history schema
- Deletes from active orders schema

**GET**: Check cleanup status
- Returns statistics about orders and cleanup status

### 3. Cron Job API (`/api/cron/cleanup-orders`)

**GET/POST**: Trigger cleanup job
- Can be called by external schedulers
- Includes optional authentication

## Implementation Details

### Automatic Cleanup Process

1. **Scheduled Execution**: Cleanup job runs every hour (configurable)
2. **Expired Order Detection**: Finds orders older than 24 hours
3. **Data Migration**: Copies order data to history schema
4. **Cleanup**: Deletes original order from active schema
5. **Audit Trail**: Maintains complete record in history

### Configuration

The system can be configured via environment variables:

```env
CRON_SECRET_TOKEN=your-secret-token  # Optional: for cron job authentication
```

### Utility Functions

The `lib/orderLifecycle.ts` file provides helper functions:

- `calculateExpiryDate()`: Calculate when an order expires
- `isOrderExpired()`: Check if an order has expired
- `createHistoryRecord()`: Create history record from order
- `validateOrderForHistory()`: Validate order data

## Application Integration

### Cart Page (`/cart`)
- Fetches active orders only (`type=active`)
- Shows current/pending orders

### Orders Page (`/orders`)
- Toggle between active and historical orders
- Shows complete order history with lifecycle information

### Order Creation
- All new orders are created in both schemas
- Ensures data integrity and historical preservation

## Monitoring and Maintenance

### Cleanup Statistics

Monitor the system via the cleanup API:

```bash
GET /api/orders/cleanup
```

Returns:
```json
{
  "expiredOrders": 5,
  "activeOrders": 12,
  "historyRecords": 150,
  "lastCheck": "2024-01-15T10:30:00Z"
}
```

### Manual Cleanup

Trigger cleanup manually:

```bash
POST /api/orders/cleanup
```

### Cron Job Setup

For production, set up a cron job to call the cleanup endpoint:

```bash
# Run every hour
0 * * * * curl -X POST https://your-domain.com/api/cron/cleanup-orders
```

## Benefits

1. **Performance**: Active orders schema remains small and fast
2. **Storage Efficiency**: Automatic cleanup prevents data bloat
3. **Historical Data**: Complete audit trail maintained
4. **Analytics**: Rich historical data for business intelligence
5. **Compliance**: Permanent record keeping for regulatory requirements

## Migration Notes

### Existing Data

If migrating from a single schema system:

1. Create the new OrderHistory schema
2. Run a one-time migration script to copy existing orders
3. Update application code to use dual schema
4. Deploy the new system

### Backward Compatibility

The system maintains backward compatibility:
- Existing order queries continue to work
- New `type` parameter is optional (defaults to active)
- Gradual migration possible

## Troubleshooting

### Common Issues

1. **Cleanup Not Running**: Check cron job configuration
2. **Data Loss**: Verify history schema is working correctly
3. **Performance Issues**: Monitor active orders count

### Debugging

Use the cleanup status endpoint to monitor system health:

```bash
GET /api/orders/cleanup
```

Check logs for cleanup job execution and any errors.

## Future Enhancements

1. **Configurable Retention**: Allow different retention periods
2. **Advanced Analytics**: Built-in reporting on historical data
3. **Data Export**: Export functionality for historical data
4. **Backup Integration**: Automated backup of history schema