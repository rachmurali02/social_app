'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Calendar, MapPin, Clock, Users, ArrowLeft, Loader2, X, CalendarX2, CalendarClock } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import BottomNav from '../../components/BottomNav'

type Meetup = {
  id: string
  status: string
  preferences: { location?: string; time?: string; date?: string; activity?: string }
  selectedOption?: { name?: string; address?: string; mapUrl?: string }
  creator: { id: string; name: string | null; email: string }
  participants: { user: { id: string; name: string | null; email: string }; status: string }[]
}

function getPlacePhoto(placeName?: string, meetupId?: string) {
  const seed = (placeName || meetupId || 'meetup').replace(/[^a-zA-Z0-9]/g, '-')
  return `https://picsum.photos/seed/${seed}/800/300`
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-neutral-950 to-black">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (loading || !meetup) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-black via-neutral-950 to-black">
        {loading ? (
          <Loader2 className="animate-spin text-white" size={40} />
        ) : (
          <p className="text-white/80">Meetup not found</p>
        )}
        <Link href="/meetups" className="text-blue-400 hover:text-blue-300">
          Back to Meetups
        </Link>
      </div>
    )
  }

  const placeName = (meetup.selectedOption as { name?: string })?.name || meetup.preferences?.activity || 'Meetup'
  const address = (meetup.selectedOption as { address?: string })?.address
  const mapUrl = (meetup.selectedOption as { mapUrl?: string })?.mapUrl
  const time = meetup.preferences?.time
  const activity = meetup.preferences?.activity
  const isCreator = meetup.creator.id === session?.user?.id

  const dateForCalendar = meetup.preferences?.date || new Date().toISOString().split('T')[0]
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
    <div className="min-h-screen bg-neutral-950 pb-24 pb-safe">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/meetups"
          className="inline-flex items-center gap-2 text-white/90 hover:text-white p-4 -mx-4 transition-colors"
        >
          <ArrowLeft size={22} /> Back
        </Link>

        <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden mx-4 mb-6">
          <Image
            src={getPlacePhoto(placeName, meetup.id)}
            alt=""
            fill
            className="object-cover img-premium"
            unoptimized
          />
          <div className="absolute inset-0 hero-overlay" />
          <div className="absolute inset-0 hero-vignette" />
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-2xl font-bold text-white">{placeName}</h1>
            <p className="text-white/90">{activity || 'Meetup'}</p>
            <span
              className={`inline-block mt-2 px-2 py-1 rounded text-sm font-medium ${
                meetup.status === 'cancelled'
                  ? 'bg-red-500/30 text-red-200'
                  : meetup.status === 'confirmed'
                    ? 'bg-emerald-500/30 text-emerald-200'
                    : 'bg-amber-500/30 text-amber-200'
              }`}
            >
              {meetup.status === 'cancelled' ? 'Cancelled' : meetup.status === 'confirmed' ? 'Confirmed' : 'Pending'}
            </span>
          </div>
        </div>

        <div className="px-4 space-y-4">
          <div className="glass-panel rounded-2xl p-5 space-y-4 mx-4 -mt-2">
          {address && (
            <div className="flex items-start gap-3 text-white/90">
              <MapPin size={20} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Location</p>
                {mapUrl ? (
                  <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    {address}
                  </a>
                ) : (
                  <p>{address}</p>
                )}
              </div>
            </div>
          )}
          {time && (
            <div className="flex items-center gap-3 text-white/90">
              <Clock size={20} className="shrink-0" />
              <div>
                <p className="font-medium">Time</p>
                <p>{time}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3 text-white/90">
            <Users size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Participants</p>
              <p>
                {isCreator ? 'Created by you' : `By ${meetup.creator.name || meetup.creator.email}`}
              </p>
              <ul className="mt-1 text-white/70 text-sm space-y-1">
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
              className="block w-full py-3.5 rounded-2xl bg-blue-500 hover:bg-blue-500/90 text-white font-medium text-center transition-colors shadow-lg shadow-blue-500/25"
            >
              Respond to invitation
            </Link>
          )}
          {isCreator && meetup.status !== 'cancelled' && (
            <div className="flex gap-3">
              <button
                onClick={() => setRescheduleOpen(true)}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors border border-white/20 disabled:opacity-50"
              >
                <CalendarClock size={20} /> Reschedule
              </button>
              <button
                onClick={handleCancel}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500/20 hover:bg-red-500/30 text-red-200 font-medium transition-colors border border-red-500/30 disabled:opacity-50"
              >
                <CalendarX2 size={20} /> Cancel
              </button>
            </div>
          )}
          {time && meetup.status !== 'cancelled' && (
            <a
              href={addToCalendar() || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors border border-white/20"
            >
              <Calendar size={20} /> Add to Calendar
            </a>
          )}
          </div>
        </div>
      </div>

      {rescheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-white/20 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Reschedule</h3>
              <button onClick={() => setRescheduleOpen(false)} className="text-white/60 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div>
              <label className="block text-white/80 text-sm mb-1">Date</label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white"
              />
            </div>
            <div>
              <label className="block text-white/80 text-sm mb-1">Time</label>
              <input
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setRescheduleOpen(false)}
                className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20"
              >
                Close
              </button>
              <button
                onClick={handleReschedule}
                disabled={busy}
                className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
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
