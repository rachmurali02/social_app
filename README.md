# MeetUp AI - Social Coordination App

A Next.js app for planning meetups with AI-powered place recommendations.

## Features

- Two-user coordination system (Organizer & Responder)
- AI-powered place recommendations
- Interactive tile-based UI
- Calendar integration
- Friend invitation system
- Mobile-friendly with swipe gestures

## Prerequisites

**Node.js 18.17.0 or higher is required.**

If you're using an older version, install Node.js 18+ using:
- **nvm (recommended)**: `nvm install 18 && nvm use 18`
- **Homebrew (macOS)**: `brew install node@18`
- **Download**: https://nodejs.org/

## Getting Started

See **[INSTALLATION.md](./INSTALLATION.md)** for complete step-by-step installation instructions.

**Quick Start:**
1. Install dependencies: `npm install`
2. Set up `.env.local` with required environment variables
3. Set up database: `npx prisma generate && npx prisma db push`
4. Run dev server: `npm run dev`
5. Open http://localhost:3000

## Deployment to Vercel

Vercel automatically uses Node.js 18+, so no version upgrade needed for deployment.

1. Push your code to GitHub
2. Set up a PostgreSQL database (Vercel Postgres, Supabase, or any PostgreSQL provider)
3. Import your repository in Vercel
4. Add these environment variables in Vercel dashboard (Settings → Environment Variables):
   - `ANTHROPIC_API_KEY`
   - `DATABASE_URL` (your PostgreSQL connection string)
   - `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
   - `NEXTAUTH_URL` (your Vercel deployment URL)
5. Deploy!

The app will be live at `https://your-project.vercel.app`

## Features

- ✅ User authentication (email/password)
- ✅ User profiles
- ✅ Friend system (search, request, accept)
- ✅ AI-powered meetup recommendations
- ✅ Schedule meetups with friends
- ✅ Calendar integration
- ✅ Interactive tile-based UI
- ✅ Mobile-friendly with swipe gestures

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- NextAuth.js (authentication)
- Prisma (database ORM)
- PostgreSQL (database)
- Tailwind CSS
- Lucide React (icons)
