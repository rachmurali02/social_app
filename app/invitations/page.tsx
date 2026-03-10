'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Calendar, MapPin, Clock, Users, Check, X, Star } from 'lucide-react'
import Link from 'next/link'

interface Invitation {
  id: string
  status: string
  createdAt: string
  meetup: {
    id: string
    preferences: {
      location: string
      radius: number
      time: string
      date?: string
      activity: string
    }
    selectedOption: {
      name: string
      address: string
      rating: number
      popularity: string
      reason: string
      mapUrl: string
    }
    creator: {
      id: string
      name: string | null
      email: string
    }
  }
}

export default function InvitationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchInvitations()
    }
  }, [session])

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/meetups?type=invitations')
      const data = await response.json()
      setInvitations(data.invitations || [])
    } catch (error) {
      console.error('Error fetching invitations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (participantId: string) => {
    try {
      const response = await fetch('/api/meetups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          participantId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to confirm invitation')
      }

      await fetchInvitations()
    } catch (error) {
      console.error('Error confirming invitation:', error)
      alert('Failed to confirm invitation. Please try again.')
    }
  }

  const handleDecline = async (participantId: string) => {
    try {
      const response = await fetch('/api/meetups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decline',
          participantId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to decline invitation')
      }

      await fetchInvitations()
    } catch (error) {
      console.error('Error declining invitation:', error)
      alert('Failed to decline invitation. Please try again.')
    }
  }

  const addToCalendar = (invitation: Invitation) => {
    if (!invitation.meetup.selectedOption || !invitation.meetup.preferences) return null
    const creatorName = invitation.meetup.creator.name || 'Someone'
    const youName = session?.user?.name || 'You'
    const withLine = `With: ${creatorName}, ${youName}`
    const prefs = invitation.meetup.preferences
    const dateStr = prefs.date || new Date().toISOString().split('T')[0]
    const timeStr = prefs.time || '18:00'
    const startTime = new Date(`${dateStr}T${timeStr}`)
    const endTime = new Date(startTime)
    endTime.setHours(endTime.getHours() + 2)
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const title = `Meetup at ${invitation.meetup.selectedOption.name}`
    const description = `${prefs.activity} meetup\n${invitation.meetup.selectedOption.reason}\n\n${withLine}`
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(startTime)}/${fmt(endTime)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(invitation.meetup.selectedOption.address)}`
    return { googleCalendarUrl }
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-950">
        <div className="text-neutral-600 dark:text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 p-4 sm:p-6 pb-24 pb-safe">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-white mb-1 truncate">Meetup Invitations</h1>
            <p className="text-neutral-600 dark:text-white/70 text-sm sm:text-base">Respond to your pending invitations</p>
          </div>
          <Link
            href="/dashboard"
            className="shrink-0 min-h-[44px] glass-panel px-4 sm:px-6 py-3 rounded-2xl text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-white/[0.08] transition-all flex items-center justify-center font-medium"
          >
            ← Dashboard
          </Link>
        </div>

        {loading ? (
          <div className="text-center text-neutral-600 dark:text-white/80 py-12">Loading invitations...</div>
        ) : invitations.length === 0 ? (
          <div className="glass-panel rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center">
            <Calendar className="mx-auto mb-4 text-neutral-300 dark:text-white/40" size={48} />
            <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-white mb-2">No Pending Invitations</h2>
            <p className="text-neutral-600 dark:text-white/70 text-sm sm:text-base mb-6">You&apos;re all caught up! Check back later.</p>
            <Link
              href="/meetup"
              className="inline-block min-h-[44px] bg-gradient-to-r from-orange-500 to-purple-600 text-white px-6 py-3 rounded-2xl font-semibold hover:shadow-lg transition-all"
            >
              Plan Your Own Meetup
            </Link>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-neutral-200 dark:bg-white/10 border border-neutral-300 dark:border-white/20 flex items-center justify-center text-neutral-900 dark:text-white font-bold text-base shrink-0 overflow-hidden">
                      {(invitation.meetup.creator.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-neutral-900 dark:text-white font-semibold text-base sm:text-lg truncate">
                        {invitation.meetup.creator.name || 'Someone'} invited you
                      </p>
                      <p className="text-neutral-500 dark:text-white/60 text-xs sm:text-sm">
                        {new Date(invitation.createdAt).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: new Date(invitation.createdAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                        })}
                      </p>
                    </div>
                  </div>
                  {invitation.status === 'pending' && (
                    <div className="flex gap-2 sm:gap-3 flex-shrink-0">
                      <button
                        onClick={() => handleConfirm(invitation.id)}
                        className="flex-1 sm:flex-none min-h-[44px] bg-green-500 hover:bg-green-600 text-white px-4 sm:px-6 py-3 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2"
                      >
                        <Check size={18} /> Confirm
                      </button>
                      <button
                        onClick={() => handleDecline(invitation.id)}
                        className="flex-1 sm:flex-none min-h-[44px] bg-red-500 hover:bg-red-600 text-white px-4 sm:px-6 py-3 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2"
                      >
                        <X size={18} /> Decline
                      </button>
                    </div>
                  )}
                  {invitation.status === 'confirmed' && (
                    <div className="bg-green-100 dark:bg-green-500/20 border border-green-300 dark:border-green-400/30 px-3 py-2 rounded-xl sm:rounded-full self-start">
                      <span className="text-green-700 dark:text-green-300 font-semibold flex items-center gap-2 text-sm">
                        <Check size={14} /> Confirmed
                      </span>
                    </div>
                  )}
                  {invitation.status === 'declined' && (
                    <div className="bg-red-100 dark:bg-red-500/20 border border-red-300 dark:border-red-400/30 px-3 py-2 rounded-xl sm:rounded-full self-start">
                      <span className="text-red-700 dark:text-red-300 font-semibold flex items-center gap-2 text-sm">
                        <X size={14} /> Declined
                      </span>
                    </div>
                  )}
                </div>

                {invitation.meetup.selectedOption && (
                  <div className="bg-neutral-50 dark:bg-white/[0.06] rounded-2xl p-4 sm:p-6 border border-neutral-200 dark:border-white/[0.08]">
                    <div className="mb-4">
                      <h3 className="text-lg sm:text-xl font-semibold text-neutral-900 dark:text-white mb-1 truncate">
                        {invitation.meetup.selectedOption.name}
                      </h3>
                      <p className="text-neutral-600 dark:text-white/70 text-sm mb-3 line-clamp-2">{invitation.meetup.selectedOption.address}</p>
                      <div className="flex flex-wrap gap-3 sm:gap-4 text-neutral-700 dark:text-white/90 text-sm">
                        <span className="flex items-center gap-1.5">
                          <Star size={16} fill="gold" stroke="gold" />
                          {Number(invitation.meetup.selectedOption.rating).toFixed(1)}/5
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={16} />
                          {invitation.meetup.preferences.date && invitation.meetup.preferences.time
                            ? new Date(`${invitation.meetup.preferences.date}T${invitation.meetup.preferences.time}`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + invitation.meetup.preferences.time
                            : invitation.meetup.preferences.date
                              ? new Date(invitation.meetup.preferences.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                              : invitation.meetup.preferences.time}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users size={16} />
                          {invitation.meetup.preferences.activity}
                        </span>
                      </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-blue-500/10 border border-amber-200 dark:border-blue-400/20 rounded-xl p-3 sm:p-4 mb-4">
                      <p className="text-amber-800 dark:text-blue-200 font-medium text-sm mb-1">💡 {invitation.meetup.selectedOption.popularity}</p>
                      <p className="text-neutral-600 dark:text-white/70 text-sm italic line-clamp-2">&quot;{invitation.meetup.selectedOption.reason}&quot;</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <a
                        href={invitation.meetup.selectedOption.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[44px] bg-neutral-200 dark:bg-white/10 hover:bg-neutral-300 dark:hover:bg-white/20 text-neutral-900 dark:text-white px-4 py-3 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2"
                      >
                        <MapPin size={18} /> View on Map
                      </a>
                      {invitation.status === 'confirmed' && (
                        <button
                          onClick={() => {
                            const cal = addToCalendar(invitation)
                            if (cal) window.open(cal.googleCalendarUrl, '_blank')
                          }}
                          className="min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2"
                        >
                          <Calendar size={18} /> Add to Calendar
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
