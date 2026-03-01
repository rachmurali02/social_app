# Loom - Social Coordination App

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

## Hosting (share on a domain for ~$0–10/month)

See **[HOSTING.md](./HOSTING.md)** for step-by-step options so anyone can use the app at a URL:

- **Vercel (free)** – recommended for Next.js; free tier + optional custom domain
- **Railway (~$5/mo)** – simple deploy from GitHub
- **Render (~$7/mo for always-on)** – free tier can sleep when idle
- **Custom domain** – buy a domain (~$10–15/year) and point it at your host

## Deployment to Vercel (quick)

1. Push your code to GitHub
2. Set up a PostgreSQL database (Supabase or Neon; use the **Session/direct** connection string)
3. Import your repository in [Vercel](https://vercel.com)
4. Add environment variables: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (your Vercel URL)
5. Deploy — app will be at `https://your-project.vercel.app`

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
