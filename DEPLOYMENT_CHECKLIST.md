# Vercel Cron Job Deployment Checklist

## Pre-Deployment Checklist

### ✅ Environment Variables
- [ ] `NEXT_PUBLIC_SANITY_PROJECT_ID` is set
- [ ] `NEXT_PUBLIC_SANITY_DATASET` is set
- [ ] `SANITY_API_TOKEN` has write permissions
- [ ] `CRON_SECRET_TOKEN` is set (optional but recommended)

### ✅ Configuration Files
- [ ] `vercel.json` is in the root directory
- [ ] Cron schedule is correct (`0 0 * * *` for daily at midnight UTC)
- [ ] Function timeouts are set appropriately (300 seconds)

### ✅ API Endpoints
- [ ] `/api/cron/cleanup-orders` exists and is working
- [ ] `/api/orders/cleanup` exists and is working
- [ ] Both endpoints handle errors gracefully

### ✅ Sanity Schema
- [ ] `orderHistory` schema is deployed to Sanity
- [ ] `order` schema has lifecycle fields (`expiresAt`, `isArchived`, `archivedAt`)
- [ ] Both schemas are properly indexed

## Deployment Steps

### 1. Deploy to Vercel
```bash
# Option 1: Using Vercel CLI
vercel --prod

# Option 2: Git push (if connected to Vercel)
git add .
git commit -m "Add Vercel cron job for order cleanup"
git push origin main
```

### 2. Verify Deployment
- [ ] Check Vercel dashboard for successful deployment
- [ ] Verify `vercel.json` is recognized
- [ ] Check Functions tab for cron job registration

### 3. Test Endpoints
```bash
# Test cleanup status
curl https://your-domain.vercel.app/api/orders/cleanup

# Test manual cleanup
curl -X POST https://your-domain.vercel.app/api/orders/cleanup

# Test cron endpoint
curl -X POST https://your-domain.vercel.app/api/cron/cleanup-orders
```

### 4. Run Test Script
```bash
# Make script executable
chmod +x scripts/test-cron.js

# Run tests
node scripts/test-cron.js
```

## Post-Deployment Verification

### ✅ Function Registration
- [ ] Cron job appears in Vercel Functions tab
- [ ] Schedule shows as "0 0 * * *" (daily at midnight UTC)
- [ ] Function path is correct (`/api/cron/cleanup-orders`)

### ✅ Authentication
- [ ] Manual requests with token work
- [ ] Requests without token are rejected (if token is set)
- [ ] Vercel cron requests are allowed

### ✅ Data Flow
- [ ] Create test orders in Sanity
- [ ] Wait for orders to be older than 24 hours (or modify logic temporarily)
- [ ] Trigger manual cleanup
- [ ] Verify orders moved to history schema
- [ ] Verify orders deleted from active schema

### ✅ Logging
- [ ] Check Vercel function logs for successful execution
- [ ] Verify detailed logging is working
- [ ] Check for any error messages

## Monitoring Setup

### ✅ Vercel Dashboard
- [ ] Monitor function execution times
- [ ] Check error rates
- [ ] Verify cron job is running on schedule

### ✅ Custom Monitoring
- [ ] Set up alerts for function failures
- [ ] Monitor cleanup statistics
- [ ] Track processing times

## Troubleshooting Common Issues

### ❌ Cron Job Not Running
**Check:**
- [ ] Vercel plan supports cron jobs (Pro or higher)
- [ ] `vercel.json` is in root directory
- [ ] Function path exists and is accessible
- [ ] No syntax errors in configuration

### ❌ Authentication Errors
**Check:**
- [ ] `CRON_SECRET_TOKEN` is set correctly
- [ ] Token is included in Authorization header
- [ ] Token matches exactly (no extra spaces)

### ❌ Function Timeout
**Check:**
- [ ] Increase `maxDuration` in `vercel.json`
- [ ] Optimize cleanup logic
- [ ] Process orders in smaller batches

### ❌ Sanity API Errors
**Check:**
- [ ] `SANITY_API_TOKEN` has write permissions
- [ ] Sanity project is accessible
- [ ] Dataset exists and is configured correctly

## Performance Optimization

### ✅ Batch Processing
- [ ] Consider processing orders in batches for large datasets
- [ ] Monitor execution times
- [ ] Adjust batch sizes as needed

### ✅ Error Handling
- [ ] Implement retry logic for failed operations
- [ ] Log detailed error information
- [ ] Set up alerts for critical failures

## Security Review

### ✅ Access Control
- [ ] Cron endpoint is properly secured
- [ ] Sensitive tokens are not exposed
- [ ] Rate limiting is implemented (if needed)

### ✅ Data Safety
- [ ] Backup strategy is in place
- [ ] Rollback procedures are documented
- [ ] Critical data is protected

## Final Verification

### ✅ First Automatic Run
- [ ] Wait for next scheduled run (midnight UTC)
- [ ] Check Vercel function logs
- [ ] Verify orders were processed correctly
- [ ] Confirm no data loss occurred

### ✅ Ongoing Monitoring
- [ ] Set up regular monitoring schedule
- [ ] Document any issues and resolutions
- [ ] Plan for maintenance and updates

## Success Criteria

The deployment is successful when:
- [ ] Cron job runs automatically at scheduled time
- [ ] Orders are moved from active to history schema
- [ ] No data loss occurs during cleanup
- [ ] System performance remains acceptable
- [ ] Error rates are minimal
- [ ] Monitoring and alerting are working

## Support Resources

- **Vercel Documentation**: https://vercel.com/docs/cron-jobs
- **Sanity Documentation**: https://www.sanity.io/docs
- **Project Documentation**: `DUAL_SCHEMA_SETUP.md`
- **Test Script**: `scripts/test-cron.js`

## Next Steps

After successful deployment:
1. Monitor the first few automatic runs
2. Set up comprehensive monitoring
3. Document any customizations
4. Plan for future enhancements
5. Train team members on the system