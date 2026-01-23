# Troubleshooting: DATABASE_URL Error

## The Error
```
Error validating datasource `db`: the URL must start with the protocol `postgresql://` or `postgres://`.
```

This means your `DATABASE_URL` in Vercel is either:
1. **Not set** (empty/undefined)
2. **Wrong format** (doesn't start with `postgresql://` or `postgres://`)
3. **Has whitespace** (leading/trailing spaces)
4. **Has quotes** (wrapped in quotes that shouldn't be there)

## Quick Fix Checklist

### ✅ Step 1: Verify DATABASE_URL is Set in Vercel

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Look for `DATABASE_URL`
5. **Check:**
   - ✅ Does it exist?
   - ✅ Is it enabled for Production/Preview/Development?
   - ✅ Does it have a value?

### ✅ Step 2: Check the Format

Your `DATABASE_URL` **MUST** start with:
- `postgresql://` ✅
- OR `postgres://` ✅

**Common mistakes:**
- ❌ Empty string: `""`
- ❌ Just the host: `aws-1-us-east-1.pooler.supabase.com`
- ❌ Missing protocol: `postgres.seuhldhyhqkgquxjrytz:password@...`
- ❌ Wrapped in quotes: `"postgresql://..."`
- ❌ Has leading/trailing spaces: ` postgresql://... `

### ✅ Step 3: Correct Format Example

**For Supabase Connection Pooler:**
```
postgresql://postgres.seuhldhyhqkgquxjrytz:YOUR_ENCODED_PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Key requirements:**
- ✅ Starts with `postgresql://`
- ✅ Username: `postgres.{PROJECT_REF}`
- ✅ URL-encoded password
- ✅ Port: `6543` (pooler)
- ✅ Ends with `?pgbouncer=true`

### ✅ Step 4: Generate Correct URL

Use the helper script:
```bash
node scripts/generate-supabase-url.js
```

This will guide you through creating the correct format.

### ✅ Step 5: Update Vercel Environment Variable

1. In Vercel → Settings → Environment Variables
2. **Delete** the existing `DATABASE_URL` (if it exists)
3. **Add new** `DATABASE_URL` with the correct value
4. **Important:** 
   - Don't wrap it in quotes
   - Don't add spaces
   - Copy-paste the entire connection string
5. Enable for:
   - ✅ Production
   - ✅ Preview  
   - ✅ Development
6. Click **Save**

### ✅ Step 6: Redeploy

1. Go to **Deployments** tab
2. Click **"..."** on latest deployment
3. Click **Redeploy**

Or push a new commit.

## How to Verify Your DATABASE_URL

### Option 1: Check Vercel Logs

After redeploying, check the build logs. If you see the validation error, the URL is still wrong.

### Option 2: Test Locally

1. Create `.env.local` with your DATABASE_URL:
   ```bash
   DATABASE_URL="postgresql://..."
   ```

2. Test the connection:
   ```bash
   npx prisma db pull
   ```

   If this works locally, it should work on Vercel too.

### Option 3: Use Vercel CLI

```bash
vercel env pull .env.local
```

This downloads your Vercel environment variables. Check the `DATABASE_URL` value.

## Common Issues

### Issue: "DATABASE_URL is not set"

**Solution:** The environment variable doesn't exist in Vercel. Add it.

### Issue: "URL must start with postgresql://"

**Possible causes:**
1. Empty value → Set a proper connection string
2. Wrong format → Must start with `postgresql://` or `postgres://`
3. Has quotes → Remove quotes from the value
4. Has spaces → Remove leading/trailing spaces

### Issue: "Authentication failed"

This is a different error - see `QUICK_FIX_AUTH_ERROR.md`

## Still Not Working?

1. **Double-check the format** - Copy the exact format from the helper script
2. **Check for hidden characters** - Try typing it fresh instead of copy-paste
3. **Verify in Vercel** - Make sure it's saved correctly
4. **Check build logs** - Look for the exact error message
5. **Test locally first** - If it works locally, the issue is Vercel config

## Example: Correct vs Wrong

**❌ WRONG:**
```
DATABASE_URL = "postgresql://..."  (has quotes)
DATABASE_URL = postgresql://...    (missing quotes in some systems)
DATABASE_URL =                     (empty)
DATABASE_URL = aws-1-us-east-1...  (missing protocol)
```

**✅ CORRECT:**
```
DATABASE_URL=postgresql://postgres.seuhldhyhqkgquxjrytz:password@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

(No quotes, no spaces, starts with `postgresql://`)
