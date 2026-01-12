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

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env.local` file in the root directory:
```
NEXT_PUBLIC_ANTHROPIC_API_KEY=your_api_key_here
```

**Note**: The app will work without the API key, but will use fallback demo data instead of real AI recommendations.

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

Vercel automatically uses Node.js 18+, so no version upgrade needed for deployment.

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add the `NEXT_PUBLIC_ANTHROPIC_API_KEY` environment variable in Vercel dashboard (Settings → Environment Variables)
4. Deploy!

The app will be live at `https://your-project.vercel.app`

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Lucide React (icons)
