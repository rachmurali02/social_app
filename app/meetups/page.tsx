'use client'

import React from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Calendar, MapPin, Clock, Users, ChevronRight, Loader2, History, Coffee, Utensils, Beer, IceCream, Dumbbell, Film, TreePine, ShoppingBag, Gamepad2, Palette, Trophy } from 'lucide-react'
import Link from 'next/link'
import BottomNav from '../components/BottomNav'

type Meetup = {
  id: string
  status: string
  createdAt: string
  preferences: { location?: string; time?: string; date?: string; activity?: string }
  selectedOption?: { name?: string; address?: string; mapUrl?: string }
  creator: { id: string; name: string | null; email: string }
  participants: { user: { id: string; name: string | null; email: string }; status: string }[]
}

function getActivityStyle(activity?: string): { gradient: string; Icon: React.ElementType; emoji: string } {
  const a = (activity || '').toLowerCase()
  if (/coffee|cafe|latte|espresso/.test(a)) return { gradient: 'from-amber-700 to-amber-500', Icon: Coffee, emoji: '☕' }
  if (/food|restaurant|pizza|sushi|dinner|lunch|brunch|eat/.test(a)) return { gradient: 'from-orange-600 to-rose-500', Icon: Utensils, emoji: '🍽' }
  if (/bar|drinks|pub|cocktail|wine|brewery/.test(a)) return { gradient: 'from-purple-700 to-indigo-600', Icon: Beer, emoji: '🍻' }
  if (/dessert|ice.?cream|gelato|sweet|bakery/.test(a)) return { gradient: 'from-pink-500 to-rose-400', Icon: IceCream, emoji: '🍦' }
  if (/bowl/.test(a)) return { gradient: 'from-blue-600 to-cyan-500', Icon: Trophy, emoji: '🎳' }
  if (/cinem|movie|film/.test(a)) return { gradient: 'from-neutral-800 to-neutral-600', Icon: Film, emoji: '🎬' }
  if (/outdoor|park|hike|trail|nature|walk/.test(a)) return { gradient: 'from-green-700 to-emerald-500', Icon: TreePine, emoji: '🏃' }
  if (/shop|mall|market|retail/.test(a)) return { gradient: 'from-fuchsia-600 to-pink-500', Icon: ShoppingBag, emoji: '🛍' }
  if (/gam|arcade|esport/.test(a)) return { gradient: 'from-violet-700 to-purple-500', Icon: Gamepad2, emoji: '🎮' }
  if (/art|museum|gallery|theatre|theater/.test(a)) return { gradient: 'from-teal-600 to-cyan-500', Icon: Palette, emoji: '🎭' }
  if (/gym|fitness|sport|yoga|climb|pool|swim/.test(a)) return { gradient: 'from-red-600 to-orange-500', Icon: Dumbbell, emoji: '💪' }
  return { gradient: 'from-orange-500 to-purple-600', Icon: Calendar, emoji: '✨' }
}

function getMeetupDate(m: Meetup): Date {
  const dateStr = m.preferences?.date
  const timeStr = m.preferences?.time
  if (dateStr) {
    return new Date(timeStr ? `${dateStr}T${timeStr}` : dateStr)
  }
  // No date stored — fall back to createdAt
  return new Date(m.createdAt)
}

function MeetupCard({ m, userId }: { m: Meetup; userId: string }) {
  const placeName = (m.selectedOption as { name?: string })?.name || m.preferences?.activity || 'Meetup'
  const address = (m.selectedOption as { address?: string })?.address
  const time = m.preferences?.time
  const date = m.preferences?.date
  const activity = m.preferences?.activity
  const isCreator = m.creator.id === userId
  const myStatus = m.participants.find((p) => p.user.id === userId)?.status

  const displayDate = date
    ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  const { gradient, Icon, emoji } = getActivityStyle(activity)

  return (
    <Link
      href={`/meetups/${m.id}`}
      className="group block glass-panel rounded-2xl overflow-hidden hover:bg-neutral-200/60 dark:hover:bg-white/[0.08] hover:shadow-card-hover transition-all duration-300"
    >
      <div className={`relative h-28 sm:h-32 bg-gradient-to-br ${gradient} flex items-center justify-between px-5`}>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white truncate">{placeName}</h2>
          <p className="text-white/80 text-sm capitalize">{activity || 'Meetup'}</p>
          <span
            className={`inline-block mt-1.5 px-2 py-0.5 rounded text-xs font-medium ${
              m.status === 'cancelled'
                ? 'bg-black/30 text-red-200'
                : m.status === 'confirmed'
                  ? 'bg-black/30 text-emerald-200'
                  : 'bg-black/20 text-amber-100'
            }`}
          >
            {m.status === 'cancelled' ? 'Cancelled' : m.status === 'confirmed' ? 'Confirmed' : 'Pending'}
            {isCreator && ' · by you'}
            {!isCreator && myStatus && ` · ${myStatus}`}
          </span>
        </div>
        <div className="shrink-0 w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl ml-4">
          {emoji}
        </div>
      </div>
      <div className="p-4 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          {address && (
            <p className="text-neutral-600 dark:text-white/70 text-sm flex items-center gap-1 truncate">
              <MapPin size={13} /> {address}
            </p>
          )}
          {(displayDate || time) && (
            <p className="text-neutral-600 dark:text-white/70 text-sm flex items-center gap-1">
              <Clock size={13} />
              {displayDate && <span>{displayDate}</span>}
              {displayDate && time && <span className="text-neutral-400 dark:text-white/40 mx-1">·</span>}
              {time && <span>{time}</span>}
            </p>
          )}
          <p className="text-neutral-500 dark:text-white/60 text-sm flex items-center gap-1">
            <Users size={13} /> {m.participants.length + 1} attendee{m.participants.length !== 0 ? 's' : ''}
          </p>
        </div>
        <ChevronRight className="text-neutral-400 dark:text-white/50 shrink-0" size={22} />
      </div>
    </Link>
  )
}

export default function MeetupsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [meetups, setMeetups] = useState<Meetup[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (session?.user?.id) {
      fetch('/api/meetups')
        .then((r) => r.json())
        .then((d) => setMeetups(d.meetups || []))
        .catch(() => setMeetups([]))
        .finally(() => setLoading(false))
    }
  }, [session?.user?.id])

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-950">
        <div className="text-neutral-600 dark:text-white text-xl">Loading...</div>
      </div>
    )
  }

  const now = new Date()
  const upcoming = meetups.filter((m) => m.status !== 'cancelled' && getMeetupDate(m) >= now)
  const past = meetups.filter((m) => m.status === 'cancelled' || getMeetupDate(m) < now)

  const displayed = activeTab === 'upcoming' ? upcoming : past

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 p-4 sm:p-6 pb-24 pb-safe">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
            <Calendar size={28} /> Meetups
          </h1>
          <Link
            href="/meetup"
            className="text-sm font-semibold text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 flex items-center gap-1"
          >
            + New
          </Link>
        </div>
        <p className="text-neutral-600 dark:text-white/70 text-sm mb-5">
          Your meetups and invitations
        </p>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-neutral-200 dark:bg-neutral-800 rounded-xl mb-6">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'upcoming'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            }`}
          >
            <Calendar size={15} />
            Upcoming
            {upcoming.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === 'upcoming'
                  ? 'bg-orange-500 text-white'
                  : 'bg-neutral-300 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300'
              }`}>
                {upcoming.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'past'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            }`}
          >
            <History size={15} />
            Past
            {past.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === 'past'
                  ? 'bg-neutral-500 text-white'
                  : 'bg-neutral-300 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300'
              }`}>
                {past.length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12 text-neutral-500 dark:text-white/80">
            <Loader2 className="animate-spin" size={40} />
            <p>Loading meetups...</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-12 glass-panel rounded-2xl">
            {activeTab === 'upcoming' ? (
              <>
                <Calendar className="mx-auto mb-4 text-neutral-300 dark:text-white/40" size={48} />
                <p className="text-neutral-600 dark:text-white/80 text-base mb-4">No upcoming meetups</p>
                <Link
                  href="/meetup"
                  className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 dark:text-orange-400 font-semibold"
                >
                  Plan one now <ChevronRight size={18} />
                </Link>
              </>
            ) : (
              <>
                <History className="mx-auto mb-4 text-neutral-300 dark:text-white/40" size={48} />
                <p className="text-neutral-600 dark:text-white/80 text-base">No past meetups yet</p>
              </>
            )}
          </div>
        ) : (
          <ul className="space-y-4">
            {displayed.map((m) => (
              <li key={m.id}>
                <MeetupCard m={m} userId={session.user.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
