# Vercel Database Setup Guide

## The Problem
Your app is trying to connect to Supabase but can't reach the database server. This happens because:

1. **DATABASE_URL not set in Vercel**: Environment variables need to be configured in Vercel
2. **Direct connection issues**: Supabase direct connections can be blocked or have connection limits
3. **Connection pooling**: Serverless functions need connection pooling

## Solution: Use Supabase Connection Pooler

### Step 1: Get Your Supabase Connection Pooler URL

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Database**
3. Scroll down to **Connection Pooling**
4. Copy the **Connection string** under "Transaction" mode (recommended for Prisma)

It should look like:
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Important**: Use port `6543` (pooler) NOT `5432` (direct connection)

### Step 2: URL-Encode Your Password

If your password has special characters, you need to URL-encode them:

- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `!` → `%21`
- `*` → `%2A`
- `(` → `%28`
- `)` → `%29`
- `+` → `%2B`
- `=` → `%3D`
- `?` → `%3F`
- `[` → `%5B`
- `]` → `%5D`

Or use the helper script:
```bash
bash scripts/url-encode-password.sh
```

### Step 3: Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

#### Required Variables:

**DATABASE_URL**
- Value: Your Supabase connection pooler URL (from Step 1)
- Environment: Production, Preview, Development (select all)
- Example:
  ```
  postgresql://postgres.xxxxx:YOUR_ENCODED_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
  ```

**NEXTAUTH_SECRET**
- Value: A random secret string (generate one: `openssl rand -base64 32`)
- Environment: Production, Preview, Development (select all)

**NEXTAUTH_URL**
- Value: Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
- Environment: Production
- For Preview: `https://your-app-git-branch.vercel.app` (or use `VERCEL_URL`)

**ANTHROPIC_API_KEY**
- Value: Your Anthropic API key
- Environment: Production, Preview, Development (select all)

### Step 4: Update Prisma Schema (if needed)

If you're using the connection pooler, make sure your `prisma/schema.prisma` has:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // Optional: for migrations only
}
```

For migrations, you might need a `DIRECT_URL` (direct connection on port 5432) in addition to `DATABASE_URL` (pooler on port 6543).

### Step 5: Run Migrations

After setting up the environment variables:

```bash
# Push schema to database
npx prisma db push

# Or run migrations
npx prisma migrate dev
```

### Step 6: Redeploy

After setting environment variables in Vercel:
1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Select **"Redeploy"**

Or push a new commit to trigger a new deployment.

## Troubleshooting

### Error: "Can't reach database server"
- ✅ Check that `DATABASE_URL` is set in Vercel environment variables
- ✅ Verify you're using the **connection pooler URL** (port 6543), not direct (port 5432)
- ✅ Ensure password is URL-encoded if it has special characters
- ✅ Check Supabase dashboard to ensure database is running

### Error: "Too many connections"
- ✅ You're likely using direct connection (port 5432) instead of pooler (port 6543)
- ✅ Switch to connection pooler URL

### Error: "Authentication failed"
- ✅ Verify password is correct and URL-encoded
- ✅ Check that the connection string format is correct

## Quick Test

After setting up, test the connection:

```bash
# Set DATABASE_URL locally (for testing)
export DATABASE_URL="your-pooler-url-here"

# Test connection
npx prisma db pull
```

If this works locally, it should work on Vercel too (after setting the env var).
