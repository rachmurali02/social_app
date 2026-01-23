# Quick Fix: Authentication Failed Error

## The Error
```
Authentication failed against database server at `aws-1-us-east-1.pooler.supabase.com`, 
the provided database credentials for `postgres` are not valid.
```

## Common Causes

1. **Wrong username format** - Must be `postgres.{PROJECT_REF}`, not just `postgres`
2. **Password not URL-encoded** - Special characters need encoding
3. **Missing `?pgbouncer=true`** - Required for connection pooler
4. **Wrong port** - Must be `6543` (pooler), not `5432` (direct)

## Quick Fix Steps

### Step 1: Get Your Supabase Info

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **Database**
4. Find:
   - **Project Ref** (e.g., `seuhldhyhqkgquxjrytz`)
   - **Database Password** (the one you set when creating the project)
   - **Connection Pooling** section → Copy the pooler host (e.g., `aws-1-us-east-1.pooler.supabase.com`)

### Step 2: Generate Correct Connection String

**Option A: Use the helper script**
```bash
node scripts/generate-supabase-url.js
```

**Option B: Manual format**

The format is:
```
postgresql://postgres.{PROJECT_REF}:{URL_ENCODED_PASSWORD}@{POOLER_HOST}:6543/postgres?pgbouncer=true
```

**Example:**
- Project Ref: `seuhldhyhqkgquxjrytz`
- Password: `MyPass123!` → URL-encoded: `MyPass123%21`
- Pooler Host: `aws-1-us-east-1.pooler.supabase.com`

Result:
```
postgresql://postgres.seuhldhyhqkgquxjrytz:MyPass123%21@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Step 3: URL-Encode Your Password

If your password has special characters, encode them:

**Common encodings:**
- `!` → `%21`
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `*` → `%2A`
- `(` → `%28`
- `)` → `%29`
- `+` → `%2B`
- `=` → `%3D`
- `?` → `%3F`

**Or use this command:**
```bash
node -e "console.log(encodeURIComponent('YOUR_PASSWORD_HERE'))"
```

### Step 4: Update Vercel Environment Variable

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Find `DATABASE_URL`
5. **Delete the old value**
6. **Paste the new connection string** (from Step 2)
7. Make sure it's enabled for:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
8. Click **Save**

### Step 5: Redeploy

1. Go to **Deployments** tab
2. Click **"..."** on the latest deployment
3. Click **Redeploy**

Or push a new commit to trigger a new deployment.

## Verify Your Connection String Format

Your `DATABASE_URL` should:
- ✅ Start with `postgresql://`
- ✅ Have username: `postgres.{PROJECT_REF}` (NOT just `postgres`)
- ✅ Have URL-encoded password
- ✅ Point to pooler host (e.g., `aws-X-us-east-1.pooler.supabase.com`)
- ✅ Use port `6543` (NOT `5432`)
- ✅ End with `?pgbouncer=true`

**❌ WRONG:**
```
postgresql://postgres:password@aws-1-us-east-1.pooler.supabase.com:5432/postgres
```

**✅ CORRECT:**
```
postgresql://postgres.seuhldhyhqkgquxjrytz:MyPass123%21@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

## Still Having Issues?

1. **Double-check your password** - Make sure it's the correct database password from Supabase
2. **Verify project ref** - Check it matches your Supabase project
3. **Test locally** - Set `DATABASE_URL` in `.env.local` and test:
   ```bash
   npx prisma db pull
   ```
4. **Check Supabase logs** - Go to Supabase Dashboard → Logs to see connection attempts
