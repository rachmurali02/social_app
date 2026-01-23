# Troubleshooting NextAuth Errors

## Common Errors

### Error 1: `Failed to load resource: the server responded with a status of 404`
### Error 2: `[next-auth][error][CLIENT_FETCH_ERROR] Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

These errors mean NextAuth can't find the session endpoint or it's returning an HTML error page instead of JSON.

## Root Causes

1. **Missing `NEXTAUTH_SECRET`** - Required for NextAuth to work
2. **Missing or wrong `NEXTAUTH_URL`** - NextAuth needs to know the base URL
3. **Route not accessible** - The `/api/auth/[...nextauth]` route might not be deployed correctly

## Quick Fix

### Step 1: Set Environment Variables in Vercel

Go to **Vercel → Settings → Environment Variables** and ensure you have:

**NEXTAUTH_SECRET** (Required)
- Generate a secret: `openssl rand -base64 32`
- Or use: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- Set for: Production, Preview, Development

**NEXTAUTH_URL** (Required for production)
- Production: Your Vercel URL (e.g., `https://your-app.vercel.app`)
- Preview: Can use `VERCEL_URL` env var or specific preview URL
- Development: `http://localhost:3000`

**Important:** 
- `NEXTAUTH_SECRET` is **required** - the app will crash without it
- `NEXTAUTH_URL` is required for production deployments

### Step 2: Verify the Route Exists

The NextAuth route should be at:
```
app/api/auth/[...nextauth]/route.ts
```

Make sure this file exists and exports GET and POST handlers.

### Step 3: Check Build Logs

After setting environment variables, check Vercel build logs for:
- ✅ No errors about missing `NEXTAUTH_SECRET`
- ✅ NextAuth route is being built correctly

### Step 4: Redeploy

After setting environment variables:
1. Go to **Deployments** tab
2. Click **"..."** on latest deployment
3. Click **Redeploy**

## Verification

### Test Locally

1. Create `.env.local`:
   ```bash
   NEXTAUTH_SECRET="your-secret-here"
   NEXTAUTH_URL="http://localhost:3000"
   DATABASE_URL="your-database-url"
   ```

2. Run dev server:
   ```bash
   npm run dev
   ```

3. Try to register/login - should work without errors

### Test on Vercel

1. After setting env vars and redeploying
2. Try to register a new user
3. Check browser console - should not see 404 errors
4. Should redirect to `/dashboard` successfully

## Common Issues

### Issue: "NEXTAUTH_SECRET is not set"

**Solution:** Set `NEXTAUTH_SECRET` in Vercel environment variables

### Issue: "404 on /api/auth/session"

**Possible causes:**
1. `NEXTAUTH_SECRET` not set → Set it in Vercel
2. Route not deployed → Check that `app/api/auth/[...nextauth]/route.ts` exists
3. Build error → Check Vercel build logs

### Issue: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"

**Solution:** This means NextAuth is getting an HTML error page. Usually means:
- `NEXTAUTH_SECRET` is missing
- Route is returning 404/500 error page
- Check Vercel function logs for the actual error

### Issue: "307/404 on /dashboard after registration"

**Solution:** 
- The registration works, but session creation fails
- Check that `NEXTAUTH_SECRET` is set
- Check that `NEXTAUTH_URL` is set correctly
- Verify the session endpoint is accessible

## Environment Variables Checklist

Before deploying, ensure these are set in Vercel:

- ✅ `DATABASE_URL` - PostgreSQL connection string
- ✅ `NEXTAUTH_SECRET` - Random secret (required)
- ✅ `NEXTAUTH_URL` - Your Vercel URL (required for production)
- ✅ `ANTHROPIC_API_KEY` - For AI recommendations

## Quick Test Script

To verify your environment variables are set correctly:

```bash
# Check if NEXTAUTH_SECRET is set
echo $NEXTAUTH_SECRET

# Generate a new secret if needed
openssl rand -base64 32
```

## Still Having Issues?

1. **Check Vercel Function Logs** - Go to Vercel → Your Project → Functions tab
2. **Check Browser Console** - Look for specific error messages
3. **Check Network Tab** - See what requests are failing
4. **Verify Route File** - Make sure `app/api/auth/[...nextauth]/route.ts` exists and is correct
