# Vercel Cron Job Setup for Order Cleanup System

## Overview

This guide covers the complete setup and deployment of a Vercel cron job for automatic order cleanup in the dual schema system. The cron job runs daily at midnight UTC to move expired orders from the Orders schema to OrderHistory schema.

## Prerequisites

- Vercel account with a deployed Next.js application
- Dual schema system already implemented (Orders + OrderHistory)
- Sanity CMS configured with write permissions

## Configuration Files

### 1. vercel.json

The main configuration file that defines the cron job:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-orders",
      "schedule": "0 0 * * *"
    }
  ],
  "functions": {
    "app/api/cron/cleanup-orders/route.ts": {
      "maxDuration": 300
    },
    "app/api/orders/cleanup/route.ts": {
      "maxDuration": 300
    }
  },
  "headers": [
    {
      "source": "/api/cron/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

**Schedule Explanation:**
- `0 0 * * *` = Daily at midnight UTC
- `0 2 * * *` = Daily at 2 AM UTC (if you prefer a different time)
- `0 */6 * * *` = Every 6 hours

## Environment Variables

Set these in your Vercel project dashboard:

### Required Variables

```env
# Sanity Configuration
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=your-write-token

# Optional: Cron Job Security
CRON_SECRET_TOKEN=your-secret-token-here
```

### Setting Environment Variables

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable with the appropriate environment (Production, Preview, Development)

## Deployment Steps

### 1. Deploy to Vercel

```bash
# If using Vercel CLI
vercel --prod

# Or push to your connected Git repository
git add .
git commit -m "Add Vercel cron job configuration"
git push origin main
```

### 2. Verify Deployment

After deployment, verify the cron job is configured:

1. Go to your Vercel dashboard
2. Select your project
3. Go to Functions tab
4. Look for the cron job in the list

## Testing the Cron Job

### 1. Manual Testing

Test the cleanup endpoint manually:

```bash
# Test the cleanup API directly
curl -X POST https://your-domain.vercel.app/api/orders/cleanup

# Test the cron endpoint
curl -X POST https://your-domain.vercel.app/api/cron/cleanup-orders

# With authentication (if CRON_SECRET_TOKEN is set)
curl -X POST \
  -H "Authorization: Bearer your-secret-token" \
  https://your-domain.vercel.app/api/cron/cleanup-orders
```

### 2. Check Cleanup Status

```bash
# Get current statistics
curl https://your-domain.vercel.app/api/orders/cleanup
```

Expected response:
```json
{
  "success": true,
  "stats": {
    "expiredOrders": 5,
    "activeOrders": 12,
    "historyRecords": 150,
    "lastCheck": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Monitor Logs

Check Vercel function logs:

1. Go to Vercel dashboard
2. Select your project
3. Go to Functions tab
4. Click on the cron function
5. View execution logs

## Verification Steps

### 1. Verify Cron Job Registration

1. Check Vercel dashboard → Functions
2. Look for cron job in the list
3. Verify the schedule is correct

### 2. Test with Sample Data

1. Create test orders in your Sanity studio
2. Wait for them to be older than 24 hours (or modify the cleanup logic temporarily)
3. Trigger manual cleanup
4. Verify orders moved to history schema

### 3. Monitor First Automatic Run

1. Wait for the next scheduled run (midnight UTC)
2. Check Vercel function logs
3. Verify orders were processed correctly

## Troubleshooting

### Common Issues

#### 1. Cron Job Not Running

**Symptoms:** No function executions in Vercel dashboard

**Solutions:**
- Verify `vercel.json` is in the root directory
- Check that the path `/api/cron/cleanup-orders` exists
- Ensure the deployment was successful
- Check Vercel plan (cron jobs require Pro plan or higher)

#### 2. Authentication Errors

**Symptoms:** 401 Unauthorized responses

**Solutions:**
- Verify `CRON_SECRET_TOKEN` is set correctly
- Check that the token is included in the Authorization header
- Ensure the token matches exactly

#### 3. Function Timeout

**Symptoms:** Function execution times out

**Solutions:**
- Increase `maxDuration` in `vercel.json`
- Optimize the cleanup logic
- Process orders in smaller batches

#### 4. Sanity API Errors

**Symptoms:** Errors related to Sanity operations

**Solutions:**
- Verify `SANITY_API_TOKEN` has write permissions
- Check Sanity project configuration
- Ensure the dataset exists and is accessible

### Debug Commands

```bash
# Test Sanity connection
curl -X POST https://your-domain.vercel.app/api/orders/cleanup

# Check function logs
vercel logs your-project-name

# Test with verbose output
curl -v -X POST https://your-domain.vercel.app/api/cron/cleanup-orders
```

## Monitoring and Alerts

### 1. Vercel Function Monitoring

- Monitor function execution times
- Set up alerts for function failures
- Track error rates

### 2. Custom Monitoring

Create a monitoring endpoint:

```typescript
// app/api/monitor/cleanup/route.ts
export async function GET() {
  const stats = await fetch('/api/orders/cleanup').then(r => r.json());
  
  // Alert if too many expired orders
  if (stats.stats.expiredOrders > 100) {
    // Send alert
  }
  
  return NextResponse.json(stats);
}
```

### 3. Log Analysis

Monitor these log patterns:
- Successful cleanup executions
- Error rates and types
- Processing times
- Number of orders processed

## Security Considerations

### 1. Authentication

- Use `CRON_SECRET_TOKEN` for manual testing
- Vercel cron jobs are automatically authenticated
- Never expose sensitive tokens in client-side code

### 2. Rate Limiting

- Consider implementing rate limiting for manual triggers
- Monitor for abuse patterns

### 3. Data Safety

- Always verify data before deletion
- Implement rollback mechanisms
- Keep backups of critical data

## Performance Optimization

### 1. Batch Processing

For large datasets, consider processing orders in batches:

```typescript
// Process orders in batches of 50
const batchSize = 50;
for (let i = 0; i < expiredOrders.length; i += batchSize) {
  const batch = expiredOrders.slice(i, i + batchSize);
  // Process batch
}
```

### 2. Parallel Processing

Use Promise.all for independent operations:

```typescript
const promises = expiredOrders.map(order => processOrder(order));
await Promise.all(promises);
```

### 3. Caching

Cache frequently accessed data:

```typescript
// Cache shop information
const shopCache = new Map();
```

## Maintenance

### 1. Regular Monitoring

- Check function logs weekly
- Monitor error rates
- Verify data integrity

### 2. Updates

- Keep dependencies updated
- Test changes in staging environment
- Monitor for breaking changes

### 3. Backup Strategy

- Regular backups of history schema
- Test restore procedures
- Document recovery processes

## Support

For issues with:
- **Vercel Cron Jobs**: Check Vercel documentation
- **Sanity Integration**: Refer to Sanity docs
- **Application Logic**: Review the dual schema implementation

## Next Steps

1. Deploy the configuration
2. Test manually
3. Monitor the first automatic run
4. Set up monitoring and alerts
5. Document any customizations