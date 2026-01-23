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

    const event = {
      title: `Meetup at ${invitation.meetup.selectedOption.name}`,
      description: `${invitation.meetup.preferences.activity} meetup\n${invitation.meetup.selectedOption.reason}\n\nInvited by: ${invitation.meetup.creator.name || invitation.meetup.creator.email}`,
      location: invitation.meetup.selectedOption.address,
      startTime: new Date(`${new Date().toISOString().split('T')[0]}T${invitation.meetup.preferences.time}`),
      endTime: new Date(`${new Date().toISOString().split('T')[0]}T${invitation.meetup.preferences.time}`),
    }

    event.endTime.setHours(event.endTime.getHours() + 2)

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      event.title
    )}&dates=${event.startTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${event.endTime
      .toISOString()
      .replace(/[-:]/g, '')
      .split('.')[0]}Z&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(
      event.location
    )}`

    return { googleCalendarUrl }
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="tiles" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="48" height="48" fill="rgba(255,255,255,0.1)" rx="8" />
              <rect x="52" y="52" width="48" height="48" fill="rgba(255,255,255,0.05)" rx="8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#tiles)" className="animate-pulse" />
        </svg>
      </div>

      <div className="relative z-10 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-5xl font-black text-white mb-2 drop-shadow-lg">Meetup Invitations</h1>
              <p className="text-white/80 text-lg">Respond to your pending invitations</p>
            </div>
            <Link
              href="/dashboard"
              className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all"
            >
              ← Dashboard
            </Link>
          </div>

          {loading ? (
            <div className="text-center text-white/80 py-12">Loading invitations...</div>
          ) : invitations.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20 text-center">
              <Calendar className="mx-auto mb-4 text-white/40" size={64} />
              <h2 className="text-2xl font-bold text-white mb-2">No Pending Invitations</h2>
              <p className="text-white/80 mb-6">You're all caught up! Check back later for new invitations.</p>
              <Link
                href="/meetup"
                className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-2xl hover:shadow-blue-500/50 transition-all"
              >
                Plan Your Own Meetup
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                          {(invitation.meetup.creator.name || invitation.meetup.creator.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-semibold text-lg">
                            {invitation.meetup.creator.name || invitation.meetup.creator.email} invited you
                          </p>
                          <p className="text-white/60 text-sm">
                            {new Date(invitation.createdAt).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                    {invitation.status === 'pending' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleConfirm(invitation.id)}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-2xl hover:shadow-green-500/50 transition-all flex items-center gap-2"
                        >
                          <Check size={20} /> Confirm
                        </button>
                        <button
                          onClick={() => handleDecline(invitation.id)}
                          className="bg-red-500/80 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2"
                        >
                          <X size={20} /> Decline
                        </button>
                      </div>
                    )}
                    {invitation.status === 'confirmed' && (
                      <div className="bg-green-500/20 border border-green-400/30 px-4 py-2 rounded-full">
                        <span className="text-green-300 font-semibold flex items-center gap-2">
                          <Check size={16} /> Confirmed
                        </span>
                      </div>
                    )}
                    {invitation.status === 'declined' && (
                      <div className="bg-red-500/20 border border-red-400/30 px-4 py-2 rounded-full">
                        <span className="text-red-300 font-semibold flex items-center gap-2">
                          <X size={16} /> Declined
                        </span>
                      </div>
                    )}
                  </div>

                  {invitation.meetup.selectedOption && (
                    <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl p-6 mb-6">
                      <div className="flex items-start gap-2 mb-4">
                        <MapPin className="flex-shrink-0 mt-1" size={24} />
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-white mb-1">
                            {invitation.meetup.selectedOption.name}
                          </h3>
                          <p className="text-white/80 mb-3">{invitation.meetup.selectedOption.address}</p>
                          <div className="flex items-center gap-4 text-white/90">
                            <div className="flex items-center gap-2">
                              <Star size={18} fill="gold" stroke="gold" />
                              <span className="font-semibold">{invitation.meetup.selectedOption.rating}/5.0</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock size={18} />
                              <span>{invitation.meetup.preferences.time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users size={18} />
                              <span>{invitation.meetup.preferences.activity}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4 mb-4">
                        <p className="text-blue-200 font-semibold mb-2">💡 {invitation.meetup.selectedOption.popularity}</p>
                        <p className="text-white/80 italic">&quot;{invitation.meetup.selectedOption.reason}&quot;</p>
                      </div>

                      <div className="flex gap-3">
                        <a
                          href={invitation.meetup.selectedOption.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition-all flex items-center justify-center gap-2"
                        >
                          <MapPin size={20} /> View on Map
                        </a>
                        {invitation.status === 'confirmed' && (
                          <button
                            onClick={() => {
                              const cal = addToCalendar(invitation)
                              if (cal) window.open(cal.googleCalendarUrl, '_blank')
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                          >
                            <Calendar size={20} /> Add to Calendar
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
    </div>
  )
}
