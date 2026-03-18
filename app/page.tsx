'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function HomePage() {
  const { data: session, status } = useSession()

  // If already signed in, treat home as a soft landing that links into dashboard
  const isAuthed = status === 'authenticated' && !!session

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-neutral-950 to-black text-white">
      <header className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg">
            L
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">Loom</p>
            <p className="text-xs text-neutral-400">Smart social coordination</p>
          </div>
        </div>
        <nav className="flex items-center gap-3">
          {isAuthed ? (
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-sm font-medium"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login?mode=login"
                className="px-3 py-2 rounded-full text-sm font-medium text-neutral-300 hover:text-white hover:bg-white/10"
              >
                Log in
              </Link>
              <Link
                href="/login?mode=signup"
                className="px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 text-sm font-semibold shadow-lg hover:brightness-110"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-10 pb-24 flex flex-col md:flex-row items-center gap-10">
        <section className="flex-1 space-y-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight">
            Plan meetups in <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-purple-400">minutes</span>, not group chats.
          </h1>
          <p className="text-sm sm:text-base text-neutral-300 max-w-xl">
            Loom finds great spots, checks everyone&apos;s schedule, and keeps your crew in sync,
            so you can spend less time coordinating and more time hanging out.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={isAuthed ? '/meetup' : '/login?mode=signup'}
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 text-sm sm:text-base font-semibold shadow-lg hover:brightness-110"
            >
              {isAuthed ? 'Plan a meetup' : 'Get started – it’s free'}
            </Link>
            {!isAuthed && (
              <Link
                href="/login?mode=login"
                className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-white/20 text-sm sm:text-base font-medium text-neutral-200 hover:bg-white/10"
              >
                Log in instead
              </Link>
            )}
          </div>
          <p className="text-xs text-neutral-500">
            No spam. Just better plans with friends.
          </p>
        </section>
        <section className="flex-1 w-full max-w-md">
          <div className="glass-panel rounded-3xl p-5 sm:p-6 bg-white/5 border border-white/10">
            <p className="text-xs font-semibold text-neutral-300 mb-3 uppercase tracking-[0.2em]">
              HOW IT WORKS
            </p>
            <ol className="space-y-3 text-sm text-neutral-200">
              <li>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold mr-2">
                  1
                </span>
                Tell Loom who&apos;s coming and the general vibe.
              </li>
              <li>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-xs font-bold mr-2">
                  2
                </span>
                We search nearby spots and surface a few great picks.
              </li>
              <li>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-xs font-bold mr-2">
                  3
                </span>
                Lock it in, sync calendars, and keep everyone in the loop.
              </li>
            </ol>
          </div>
        </section>
      </main>
    </div>
  )
}
