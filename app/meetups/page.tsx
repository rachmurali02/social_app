'use client'

import React from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { Calendar, MapPin, Clock, Users, ChevronRight, Loader2, History, ChevronLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import BottomNav from '../components/BottomNav'
import { classifyActivity, getActivityPhotoUrl, CATEGORY_EMOJI } from '../../lib/activityPhoto'

type Meetup = {
  id: string
  status: string
  createdAt: string
  preferences: { location?: string; time?: string; date?: string; activity?: string }
  selectedOption?: { name?: string; address?: string; mapUrl?: string }
  creator: { id: string; name: string | null; email: string }
  participants: { user: { id: string; name: string | null; email: string }; status: string }[]
}


function getMeetupDate(m: Meetup): Date | null {
  const dateStr = m.preferences?.date
  const timeStr = m.preferences?.time
  if (!dateStr) return null
  return new Date(`${dateStr}T${timeStr || '00:00'}`)
}

function gcalUrl(m: Meetup): string {
  const date = m.preferences?.date
  const time = m.preferences?.time
  if (!date) return '#'
  const placeName = (m.selectedOption as { name?: string })?.name || m.preferences?.activity || 'Meetup'
  const address = (m.selectedOption as { address?: string })?.address || ''
  const activity = m.preferences?.activity || 'Meetup'
  const start = new Date(`${date}T${time || '00:00'}`)
  const end = new Date(start)
  end.setHours(end.getHours() + 2)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${activity} at ${placeName}`)}&dates=${fmt(start)}/${fmt(end)}&location=${encodeURIComponent(address)}`
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function MiniCalendar({ meetups, onSelectDate }: { meetups: Meetup[]; onSelectDate: (date: string) => void }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const datedMeetups = useMemo(() =>
    meetups.filter((m) => m.preferences?.date && m.status !== 'cancelled'),
    [meetups]
  )

  // Map date string -> meetup IDs on that day
  const dateMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const m of datedMeetups) {
      const d = m.preferences.date!
      if (!map[d]) map[d] = []
      map[d].push(m.id)
    }
    return map
  }, [datedMeetups])

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  return (
    <div className="glass-panel rounded-2xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors">
          <ChevronLeft size={16} className="text-neutral-600 dark:text-white/70" />
        </button>
        <span className="text-sm font-semibold text-neutral-800 dark:text-white">{monthLabel}</span>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors">
          <ChevronRight size={16} className="text-neutral-600 dark:text-white/70" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-neutral-400 dark:text-white/40 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const pad = String(day).padStart(2, '0')
          const monthPad = String(viewMonth + 1).padStart(2, '0')
          const dateStr = `${viewYear}-${monthPad}-${pad}`
          const ids = dateMap[dateStr]
          const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()
          const hasConflict = ids && ids.length > 1
          const hasMeetup = ids && ids.length > 0

          return (
            <button
              key={dateStr}
              onClick={() => hasMeetup && onSelectDate(dateStr)}
              className={`relative flex flex-col items-center justify-center h-9 w-full rounded-lg text-xs font-medium transition-colors
                ${isToday ? 'ring-2 ring-orange-400 ring-offset-1 dark:ring-offset-neutral-900' : ''}
                ${hasConflict ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-500/30 cursor-pointer' : ''}
                ${hasMeetup && !hasConflict ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-500/30 cursor-pointer' : ''}
                ${!hasMeetup ? 'text-neutral-600 dark:text-white/60 cursor-default' : ''}
              `}
            >
              {day}
              {hasMeetup && (
                <span className={`absolute bottom-1 w-1 h-1 rounded-full ${hasConflict ? 'bg-red-500' : 'bg-orange-500'}`} />
              )}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[11px] text-neutral-500 dark:text-white/50">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange-200 dark:bg-orange-500/30 inline-block" />Meetup</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-200 dark:bg-red-500/30 inline-block" />Conflict</span>
      </div>
    </div>
  )
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

  const category = classifyActivity(activity)
  const photoUrl = getActivityPhotoUrl(category, 800, 320)
  const emoji = CATEGORY_EMOJI[category]

  const calUrl = gcalUrl(m)

  return (
    <div className="group glass-panel rounded-2xl overflow-hidden hover:shadow-card-hover transition-all duration-300">
      <Link href={`/meetups/${m.id}`} className="block">
        <div className="relative h-32 sm:h-36 overflow-hidden">
          <Image
            src={photoUrl}
            alt={activity || 'Meetup'}
            fill
            sizes="(max-width: 640px) 100vw, 640px"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white truncate drop-shadow">{placeName}</h2>
              <p className="text-white/80 text-sm capitalize drop-shadow">{activity || 'Meetup'}</p>
              <span
                className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                  m.status === 'cancelled'
                    ? 'bg-black/40 text-red-200'
                    : m.status === 'confirmed'
                      ? 'bg-black/40 text-emerald-200'
                      : 'bg-black/30 text-amber-100'
                }`}
              >
                {m.status === 'cancelled' ? 'Cancelled' : m.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                {isCreator && ' · by you'}
                {!isCreator && myStatus && ` · ${myStatus}`}
              </span>
            </div>
            <div className="shrink-0 w-10 h-10 rounded-xl bg-black/30 backdrop-blur-sm flex items-center justify-center text-xl ml-3">
              {emoji}
            </div>
          </div>
        </div>
        <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-4">
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
      {date && m.status !== 'cancelled' && (
        <div className="px-4 pb-3">
          <a
            href={calUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-neutral-100 dark:bg-white/[0.06] hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-600 dark:text-white/70 text-xs font-medium transition-colors border border-neutral-200 dark:border-white/10"
          >
            <ExternalLink size={12} /> Add to Google Calendar
          </a>
        </div>
      )}
    </div>
  )
}

export default function MeetupsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [meetups, setMeetups] = useState<Meetup[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [showCalendar, setShowCalendar] = useState(false)
  const [highlightDate, setHighlightDate] = useState<string | null>(null)

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
  const upcoming = meetups.filter((m) => {
    if (m.status === 'cancelled') return false
    const d = getMeetupDate(m)
    return d === null || d >= now
  })
  const past = meetups.filter((m) => {
    if (m.status === 'cancelled') return true
    const d = getMeetupDate(m)
    return d !== null && d < now
  })

  const baseDisplayed = activeTab === 'upcoming' ? upcoming : past
  const displayed = highlightDate
    ? baseDisplayed.filter((m) => m.preferences?.date === highlightDate)
    : baseDisplayed

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 p-4 sm:p-6 pb-24 pb-safe lg:pl-60">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
            <Calendar size={28} /> Meetups
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setShowCalendar(v => !v); setHighlightDate(null) }}
              className={`text-sm font-semibold flex items-center gap-1 transition-colors ${
                showCalendar
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white'
              }`}
            >
              <Calendar size={16} />
              {showCalendar ? 'Hide' : 'Calendar'}
            </button>
            <Link
              href="/meetup"
              className="text-sm font-semibold text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 flex items-center gap-1"
            >
              + New
            </Link>
          </div>
        </div>
        <p className="text-neutral-600 dark:text-white/70 text-sm mb-5">
          Your meetups and invitations
        </p>

        {/* Mini calendar */}
        {showCalendar && (
          <MiniCalendar
            meetups={meetups}
            onSelectDate={(d) => {
              setHighlightDate(prev => prev === d ? null : d)
              setActiveTab('upcoming')
            }}
          />
        )}
        {highlightDate && (
          <div className="flex items-center justify-between mb-4 px-1">
            <p className="text-sm text-neutral-600 dark:text-white/70">
              Showing meetups on <span className="font-semibold text-neutral-900 dark:text-white">
                {new Date(`${highlightDate}T12:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </p>
            <button onClick={() => setHighlightDate(null)} className="text-xs text-orange-500 hover:text-orange-600 font-semibold">
              Clear
            </button>
          </div>
        )}

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
