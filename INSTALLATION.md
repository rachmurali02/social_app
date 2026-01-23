# Complete Installation Guide

Follow these steps in order to set up and run the MeetUp AI app.

## Prerequisites

### 1. Install Node.js (Version 18.17.0 or higher)

**Quick Check (Automatic):**
```bash
npm run check-node
```

This script will automatically:
- ✅ Check if your Node.js version is compatible
- ❌ If too old, install nvm and upgrade Node.js for you
- 📦 Set up Node.js 20 (LTS) automatically

**Manual Check:**
```bash
node --version
```

If you don't have Node.js 18+ installed, choose one method:

#### Option A: Using nvm (Recommended)
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
source ~/.bashrc  # or ~/.zshrc on macOS

# Install Node.js 18
nvm install 18
nvm use 18

# Verify
node --version  # Should show v18.x.x or higher
```

#### Option B: Using Homebrew (macOS)
```bash
brew install node@18
brew link node@18 --force
```

#### Option C: Direct Download
Visit https://nodejs.org/ and download Node.js 18 LTS

---

## Step-by-Step Installation

### Step 1: Check Node.js Version (Auto-upgrade if needed)

The project will automatically check Node.js version before installing. If it's too old, it will guide you to upgrade:

```bash
npm run check-node
```

**Or manually check and upgrade:**
```bash
# Check version
node --version

# If version is below 18.17.0, upgrade with nvm:
# (The check-node script will do this automatically)
```

### Step 2: Install npm Dependencies

From the project root directory (`/Users/rachanamn/social_app`):

```bash
npm install
```

**Note:** The `preinstall` script will automatically check your Node.js version before installing dependencies.

This installs:
- **React** & **Next.js** - Framework
- **NextAuth.js** - Authentication
- **Prisma** - Database ORM
- **bcryptjs** - Password hashing
- **zod** - Validation
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- All TypeScript types

**Expected output:** `added X packages` message

---

### Step 3: Set Up PostgreSQL Database

You need a PostgreSQL database. Choose one option:

#### Option A: Vercel Postgres (Best for Vercel deployment)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Create a new project or select existing
3. Go to Storage → Create Database → Postgres
4. Copy the connection string

#### Option B: Supabase (Free tier available)
1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string (URI format)

#### Option C: Local PostgreSQL
```bash
# macOS (Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb meetup_ai

# Connection string will be:
# postgresql://username:password@localhost:5432/meetup_ai
```

#### Option D: Docker (Quick local setup)
```bash
docker run --name meetup-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=meetup_ai -p 5432:5432 -d postgres:15

# Connection string:
# postgresql://postgres:password@localhost:5432/meetup_ai
```

---

### Step 4: Generate NextAuth Secret

Generate a random secret for session encryption:

```bash
openssl rand -base64 32
```

**Copy the output** - you'll need it for `.env.local`

---

### Step 5: Create Environment Variables File

Create a file named `.env.local` in the project root:

```bash
touch .env.local
```

Open `.env.local` and add:

```bash
# Anthropic API Key (for AI recommendations)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Database Connection String
# IMPORTANT: URL-encode special characters in password!
# Example: password "abc!123" becomes "abc%21123"
# Common encodings: ! = %21, @ = %40, # = %23, $ = %24, % = %25, & = %26
DATABASE_URL="postgresql://postgres:YOUR_URL_ENCODED_PASSWORD@db.seuhldhyhqkgquxjrytz.supabase.co:5432/postgres"

# NextAuth Configuration
NEXTAUTH_SECRET="paste_your_generated_secret_here"
NEXTAUTH_URL="http://localhost:3000"
```

**Important:**
- Replace `your_anthropic_api_key_here` with your actual Anthropic API key (get from https://console.anthropic.com/)
- **For Supabase:** Get your connection string from Supabase Dashboard → Settings → Database → Connection string (URI)
- **URL-encode your password:** If your password contains special characters like `!`, `@`, `#`, etc., you must URL-encode them:
  - `!` becomes `%21`
  - `@` becomes `%40`
  - `#` becomes `%23`
  - `$` becomes `%24`
  - `%` becomes `%25`
  - `&` becomes `%26`
- **Quick encode:** Use the helper script: `bash scripts/url-encode-password.sh` OR use an online URL encoder
- Replace `paste_your_generated_secret_here` with the secret from Step 4
- **Never commit `.env.local` to git** (it's already in `.gitignore`)

**Example:**
If your Supabase password is `WashingtonMango123!`, the URL-encoded version is `WashingtonMango123%21`, so your DATABASE_URL would be:
```
DATABASE_URL="postgresql://postgres:WashingtonMango123%21@db.seuhldhyhqkgquxjrytz.supabase.co:5432/postgres"
```

---

### Step 6: Set Up Database Schema

Generate Prisma Client and push the schema to your database:

```bash
# First, ensure you've installed dependencies (this installs Prisma 5.9.1)
npm install

# Generate Prisma Client (uses local Prisma from node_modules)
npm run db:generate
# OR: npx prisma generate (if local Prisma is installed)

# Push schema to database (creates all tables)
npm run db:push
# OR: npx prisma db push (if local Prisma is installed)

# (Optional) Open Prisma Studio to view data
npm run db:studio
# OR: npx prisma studio
```

**Important:** After installing dependencies with `npm install`, use `npm run` commands or ensure `npx` uses the local Prisma version from `node_modules/.bin/prisma`.

**Expected output:** 
- `✔ Generated Prisma Client`
- `✔ The following schema(s) and/or datamodel(s) are up to date`

This creates these tables in your database:
- `User` - User accounts
- `Profile` - User profiles
- `Friendship` - Friend relationships
- `MeetupSession` - Meetup sessions
- `MeetupParticipant` - Meetup participants

---

### Step 7: Verify Installation

Check that everything is installed:

```bash
# Check Node.js version (should be 18+)
node --version

# Check npm packages installed
npm list --depth=0

# Check Prisma is set up
npx prisma --version
```

---

### Step 8: Start Development Server

```bash
npm run dev
```

**Expected output:**
```
▲ Next.js 14.2.5
- Local:        http://localhost:3000
- Ready in X.Xs
```

---

### Step 9: Open in Browser

Visit: **http://localhost:3000**

You should see the login page. Create an account to get started!

---

## Troubleshooting

### Error: "Cannot find module '@prisma/client'"
```bash
npx prisma generate
npm install
```

### Error: "DATABASE_URL must be provided"
- Check that `.env.local` exists and has `DATABASE_URL`
- Restart the dev server after changing `.env.local`

### Error: "Prisma schema validation error" or "The datasource property `url` is no longer supported"

This happens when you have Prisma 7 installed globally but the project uses Prisma 5.

**Solution:**
```bash
# First, install dependencies (this installs Prisma 5.9.1 locally)
npm install

# Then use npm scripts (recommended):
npm run db:generate
npm run db:push

# OR explicitly use local Prisma:
./node_modules/.bin/prisma generate
./node_modules/.bin/prisma db push

# OR uninstall global Prisma 7:
npm uninstall -g prisma
# Then npx will use the local version
```

**Why this happens:**
- `npx prisma` uses the globally installed Prisma 7.2.0
- Project uses Prisma 5.9.1 (in package.json)
- Prisma 7 has breaking changes in schema format
- Solution: Use local Prisma 5 from `node_modules` after `npm install`

### Error: Database connection failed or Authentication failed

**Common causes:**
1. **Password not URL-encoded:** If your password has special characters (`!`, `@`, `#`, etc.), they must be URL-encoded
   - `!` → `%21`
   - `@` → `%40`
   - `#` → `%23`
   - Example: `password123!` becomes `password123%21`

2. **Wrong password:** Double-check your Supabase database password
   - Go to Supabase Dashboard → Settings → Database
   - Reset password if needed

3. **Connection string format:** Should be:
   ```
   postgresql://postgres:ENCODED_PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres
   ```

4. **Get correct connection string from Supabase:**
   - Supabase Dashboard → Settings → Database
   - Copy "Connection string" → "URI" format
   - Make sure to URL-encode the password part

**Quick fix:**
```bash
# Use the helper script to encode your password
bash scripts/url-encode-password.sh

# Or manually encode: password "abc!123" → "abc%21123"
# Then update .env.local with the encoded password
```

### Port 3000 already in use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

---

## Quick Command Reference

```bash
# Install dependencies
npm install

# Generate Prisma Client (use npm script to ensure local Prisma)
npm run db:generate

# Update database schema (use npm script to ensure local Prisma)
npm run db:push

# View database (GUI)
npm run db:studio

# Start dev server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Lint code
npm run lint

# Check Node.js version
npm run check-node
```

---

## What Gets Installed

### Production Dependencies (20 packages)
- `react` & `react-dom` - UI framework
- `next` - Full-stack React framework
- `next-auth` - Authentication
- `@prisma/client` - Database client
- `bcryptjs` - Password hashing
- `zod` - Schema validation
- `lucide-react` - Icons

### Development Dependencies (10+ packages)
- `typescript` - Type checking
- `prisma` - Database ORM CLI
- `tailwindcss` - CSS framework
- `eslint` - Code linting
- `@types/*` - TypeScript definitions

**Total:** ~30 packages installed via npm

---

## Next Steps After Installation

1. ✅ Create your first account at `/login`
2. ✅ Complete your profile at `/profile`
3. ✅ Find and add friends at `/friends?search=true`
4. ✅ Create your first meetup at `/meetup`

Enjoy your MeetUp AI app! 🎉
