'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Calendar, MapPin, Clock, Users, ArrowLeft, Loader2, X, CalendarX2, CalendarClock } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import BottomNav from '../../components/BottomNav'
import { classifyActivity, getActivityPhotoUrl, CATEGORY_EMOJI } from '../../../lib/activityPhoto'

type Meetup = {
  id: string
  status: string
  preferences: { location?: string; time?: string; date?: string; activity?: string }
  selectedOption?: { name?: string; address?: string; mapUrl?: string }
  creator: { id: string; name: string | null; email: string }
  participants: { user: { id: string; name: string | null; email: string }; status: string }[]
}


export default function MeetupDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [meetup, setMeetup] = useState<Meetup | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [rescheduleDate, setRescheduleDate] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (!session?.user?.id || !id) return
    setLoading(true)
    fetch(`/api/meetups?id=${id}`)
      .then((r) => r.json())
      .then((d) => setMeetup(d.meetup || null))
      .catch(() => setMeetup(null))
      .finally(() => setLoading(false))
  }, [session?.user?.id, id])

  useEffect(() => {
    if (meetup?.preferences?.time) setRescheduleTime(meetup.preferences.time)
    if (meetup?.preferences?.date) setRescheduleDate(meetup.preferences.date)
    else setRescheduleDate(new Date().toISOString().split('T')[0])
  }, [meetup, rescheduleOpen])

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-950">
        <div className="text-neutral-600 dark:text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (loading || !meetup) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-neutral-100 dark:bg-neutral-950">
        {loading ? (
          <Loader2 className="animate-spin text-neutral-400 dark:text-white" size={40} />
        ) : (
          <p className="text-neutral-500 dark:text-white/80">Meetup not found</p>
        )}
        <Link href="/meetups" className="text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300">
          Back to Meetups
        </Link>
      </div>
    )
  }

  const placeName = (meetup.selectedOption as { name?: string })?.name || meetup.preferences?.activity || 'Meetup'
  const address = (meetup.selectedOption as { address?: string })?.address
  const mapUrl = (meetup.selectedOption as { mapUrl?: string })?.mapUrl
  const time = meetup.preferences?.time
  const date = meetup.preferences?.date
  const activity = meetup.preferences?.activity
  const isCreator = meetup.creator.id === session?.user?.id
  const category = classifyActivity(activity)
  const photoUrl = getActivityPhotoUrl(category, 800, 500)
  const emoji = CATEGORY_EMOJI[category]

  const dateForCalendar = date || new Date().toISOString().split('T')[0]

  const formattedDateTime = (() => {
    if (!date && !time) return null
    if (date && time) {
      const dt = new Date(`${date}T${time}`)
      return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) +
        ' at ' + dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    }
    if (date) return new Date(`${date}T00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    return time
  })()
  const addToCalendar = () => {
    if (!time) return null
    const creatorName = meetup.creator.name || meetup.creator.email
    const participantNames = meetup.participants
      .map((p) => p.user.name || p.user.email)
      .filter(Boolean)
    const attendeeList = [creatorName, ...participantNames].join(', ')
    const title = `Meetup at ${placeName}`
    const description = `${activity || 'Meetup'} meetup\n\nWith: ${attendeeList}`
    const startTime = new Date(`${dateForCalendar}T${time}`)
    const endTime = new Date(startTime)
    endTime.setHours(endTime.getHours() + 2)
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(startTime)}/${fmt(endTime)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(address || '')}`
    return url
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this meetup? All participants will be notified.')) return
    setBusy(true)
    try {
      const r = await fetch('/api/meetups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', meetupId: meetup?.id }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      setMeetup(d.meetup || null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to cancel')
    } finally {
      setBusy(false)
    }
  }

  const handleReschedule = async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/meetups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reschedule',
          meetupId: meetup?.id,
          preferences: { time: rescheduleTime, date: rescheduleDate },
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      setMeetup(d.meetup || null)
      setRescheduleOpen(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to reschedule')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 pb-24 pb-safe lg:pl-56">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/meetups"
          className="inline-flex items-center gap-2 text-neutral-700 dark:text-white/90 hover:text-neutral-900 dark:hover:text-white p-4 -mx-4 transition-colors"
        >
          <ArrowLeft size={22} /> Back
        </Link>

        <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden mx-4 mb-6">
          <Image
            src={photoUrl}
            alt={activity || 'Meetup'}
            fill
            sizes="(max-width: 640px) 100vw, 672px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white drop-shadow truncate">{placeName}</h1>
              <p className="text-white/80 capitalize drop-shadow">{activity || 'Meetup'}</p>
              <span
                className={`inline-block mt-2 px-2.5 py-1 rounded-full text-sm font-medium ${
                  meetup.status === 'cancelled'
                    ? 'bg-black/40 text-red-200'
                    : meetup.status === 'confirmed'
                      ? 'bg-black/40 text-emerald-200'
                      : 'bg-black/30 text-amber-100'
                }`}
              >
                {meetup.status === 'cancelled' ? 'Cancelled' : meetup.status === 'confirmed' ? 'Confirmed' : 'Pending'}
              </span>
            </div>
            <div className="shrink-0 w-14 h-14 rounded-2xl bg-black/30 backdrop-blur-sm flex items-center justify-center text-3xl ml-4">
              {emoji}
            </div>
          </div>
        </div>

        <div className="px-4 space-y-4">
          <div className="glass-panel rounded-2xl p-5 space-y-4 mx-4 -mt-2">
          {address && (
            <div className="flex items-start gap-3 text-neutral-800 dark:text-white/90">
              <MapPin size={20} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Location</p>
                {mapUrl ? (
                  <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline dark:text-orange-400">
                    {address}
                  </a>
                ) : (
                  <p>{address}</p>
                )}
              </div>
            </div>
          )}
          {formattedDateTime && (
            <div className="flex items-center gap-3 text-neutral-800 dark:text-white/90">
              <Clock size={20} className="shrink-0" />
              <div>
                <p className="font-medium">Date &amp; Time</p>
                <p>{formattedDateTime}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3 text-neutral-800 dark:text-white/90">
            <Users size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Participants</p>
              <p>
                {isCreator ? 'Created by you' : `By ${meetup.creator.name || meetup.creator.email}`}
              </p>
              <ul className="mt-1 text-neutral-600 dark:text-white/70 text-sm space-y-1">
                {meetup.participants.map((p) => (
                  <li key={p.user.id}>
                    {p.user.name || p.user.email} — {p.status}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {!isCreator && meetup.status !== 'cancelled' && meetup.participants.some((p) => p.user.id === session?.user?.id && p.status === 'pending') && (
            <Link
              href="/invitations"
              className="block w-full py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-medium text-center transition-colors shadow-lg shadow-orange-500/25"
            >
              Respond to invitation
            </Link>
          )}
          {isCreator && meetup.status !== 'cancelled' && (
            <div className="flex gap-3">
              <button
                onClick={() => setRescheduleOpen(true)}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-neutral-200 dark:bg-white/10 hover:bg-neutral-300 dark:hover:bg-white/20 text-neutral-900 dark:text-white font-medium transition-colors border border-neutral-300 dark:border-white/20 disabled:opacity-50"
              >
                <CalendarClock size={20} /> Reschedule
              </button>
              <button
                onClick={handleCancel}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30 text-red-700 dark:text-red-200 font-medium transition-colors border border-red-300 dark:border-red-500/30 disabled:opacity-50"
              >
                <CalendarX2 size={20} /> Cancel
              </button>
            </div>
          )}
          {(time || date) && meetup.status !== 'cancelled' && (
            <a
              href={addToCalendar() || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-neutral-200 dark:bg-white/10 hover:bg-neutral-300 dark:hover:bg-white/20 text-neutral-900 dark:text-white font-medium transition-colors border border-neutral-300 dark:border-white/20"
            >
              <Calendar size={20} /> Add to Calendar
            </a>
          )}
          </div>
        </div>
      </div>

      {rescheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/20 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Reschedule</h3>
              <button onClick={() => setRescheduleOpen(false)} className="text-neutral-500 dark:text-white/60 hover:text-neutral-900 dark:hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div>
              <label className="block text-neutral-700 dark:text-white/80 text-sm mb-1">Date</label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-white/10 border border-neutral-300 dark:border-white/20 text-neutral-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-neutral-700 dark:text-white/80 text-sm mb-1">Time</label>
              <input
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-white/10 border border-neutral-300 dark:border-white/20 text-neutral-900 dark:text-white"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setRescheduleOpen(false)}
                className="flex-1 py-3 rounded-xl bg-neutral-100 dark:bg-white/10 text-neutral-900 dark:text-white font-medium hover:bg-neutral-200 dark:hover:bg-white/20"
              >
                Close
              </button>
              <button
                onClick={handleReschedule}
                disabled={busy}
                className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 size={20} className="animate-spin" /> : null}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
