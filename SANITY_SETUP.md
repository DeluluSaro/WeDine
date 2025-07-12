# Sanity Setup Guide for Reviews

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# Existing variables (should already be set)
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2025-07-09

# NEW: Required for write operations (reviews)
SANITY_API_TOKEN=your_api_token_here
```

## How to Get Your Sanity API Token

1. **Go to Sanity Dashboard**: https://www.sanity.io/manage
2. **Select your project**
3. **Go to API section**
4. **Create a new token**:
   - Name: `WeDine Reviews Token`
   - Role: `Editor` (or `Writer` if you have that option)
   - Make sure it has write permissions
5. **Copy the token** and add it to your `.env.local`

## Important Notes

- The `SANITY_API_TOKEN` is **server-side only** (not prefixed with `NEXT_PUBLIC_`)
- This token allows creating reviews in your Sanity dataset
- Keep this token secure and don't commit it to version control
- The token is only used for write operations (creating reviews)
- Read operations still use the public client

## Testing

After setting up the token:

1. Restart your development server: `npm run dev`
2. Test the connection: Visit `/api/test-sanity`
3. Try submitting a review on any food detail page

## Troubleshooting

If you still get errors:

1. **Check token permissions**: Make sure the token has write access
2. **Verify environment variables**: Restart the dev server after adding the token
3. **Check Sanity Studio**: Make sure the "Review" schema appears in your studio
4. **Test API directly**: Use the test endpoint to verify connectivity 