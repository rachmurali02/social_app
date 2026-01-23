'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Calendar, MapPin, Clock, Users, Star, TrendingUp, Zap } from 'lucide-react'
import Link from 'next/link'

interface UserPreferences {
  location: string
  radius: number
  time: string
  activity: string
  friendIds: string[]
}

interface PlaceOption {
  name: string
  address: string
  rating: number
  popularity: string
  reason: string
  mapUrl: string
  isRecommended?: boolean
}

interface AppState {
  step: 'setup' | 'options' | 'waiting' | 'confirmed' | 'invite-friends'
  preferences: UserPreferences | null
  options: PlaceOption[]
  selectedOption: PlaceOption | null
  attemptCount: number
  seenPlaces: string[]
  activeTile: number
  sessionId: string | null
  selectedFriends: string[]
}

export default function MeetupPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [friends, setFriends] = useState<any[]>([])

  const [state, setState] = useState<AppState>({
    step: 'setup',
    preferences: null,
    options: [],
    selectedOption: null,
    attemptCount: 0,
    seenPlaces: [],
    activeTile: 0,
    sessionId: null,
    selectedFriends: [],
  })

  const [loading, setLoading] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchFriends()
    }
  }, [session])

  const fetchFriends = async () => {
    try {
      const response = await fetch('/api/friends?action=list')
      const data = await response.json()
      setFriends(data.friends || [])
    } catch (error) {
      console.error('Error fetching friends:', error)
    }
  }

  useEffect(() => {
    if (state.step === 'options' && state.options.length > 0) {
      const interval = setInterval(() => {
        setState((prev) => ({
          ...prev,
          activeTile: (prev.activeTile + 1) % prev.options.length,
        }))
      }, 4000)
      return () => clearInterval(interval)
    }
  }, [state.step, state.options.length])

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      setState((prev) => ({
        ...prev,
        activeTile: (prev.activeTile + 1) % prev.options.length,
      }))
    }
    if (touchStart - touchEnd < -75) {
      setState((prev) => ({
        ...prev,
        activeTile: prev.activeTile === 0 ? prev.options.length - 1 : prev.activeTile - 1,
      }))
    }
  }

  const handleSubmitPreferences = async (prefs: Partial<UserPreferences>) => {
    setLoading(true)
    const preferences: UserPreferences = {
      location: prefs.location || '',
      radius: prefs.radius || 5,
      time: prefs.time || '18:00',
      activity: prefs.activity || '',
      friendIds: state.selectedFriends,
    }
    setState((prev) => ({ ...prev, preferences }))

    let sessionId = state.sessionId
    if (!sessionId) {
      const sessionResponse = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', preferences }),
      })
      const sessionData = await sessionResponse.json()
      sessionId = sessionData.sessionId
      setState((prev) => ({ ...prev, sessionId }))
    } else {
      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', sessionId, preferences }),
      })
    }

    try {
      const prompt = `Find 2 places for this activity:
Location: ${preferences.location}
Radius: ${preferences.radius}km
Time: ${preferences.time}
Activity: ${preferences.activity}
Exclude: ${state.seenPlaces.join(', ') || 'none'}
Return ONLY valid JSON (no markdown):
[{
  "name": "Place Name",
  "address": "Full Address",
  "rating": 4.5,
  "popularity": "80% of users pick this",
  "reason": "Why this place",
  "mapUrl": "https://maps.google.com/?q=Place+Name+Address",
  "isRecommended": true
}]`

      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        throw new Error('Recommendations API error')
      }

      const data = await response.json()
      const places = data.places

      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', sessionId, options: places }),
      })

      setState((prev) => ({
        ...prev,
        step: 'options',
        options: places,
        activeTile: 0,
      }))
    } catch (error) {
      console.error('Error getting AI recommendations, using fallbacks:', error)
      const fallbackPlaces = [
        {
          name: 'The Coffee Collective',
          address: '123 Main St, Dubai',
          rating: 4.8,
          popularity: '80% of users pick this nearby coffee shop',
          reason: 'Perfect for casual meetups with great ambiance',
          mapUrl: 'https://maps.google.com/?q=Coffee+Collective+Dubai',
          isRecommended: true,
        },
        {
          name: 'Garden Terrace Café',
          address: '456 Park Ave, Dubai',
          rating: 4.6,
          popularity: '65% prefer outdoor seating here',
          reason: 'Beautiful outdoor space, ideal for afternoon chats',
          mapUrl: 'https://maps.google.com/?q=Garden+Terrace+Dubai',
        },
      ]

      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', sessionId, options: fallbackPlaces }),
      })

      setState((prev) => ({
        ...prev,
        options: fallbackPlaces,
        step: 'options',
        activeTile: 0,
      }))
    }
    setLoading(false)
  }

  const handleSelectOption = async (option: PlaceOption) => {
    setState((prev) => ({
      ...prev,
      selectedOption: option,
      seenPlaces: [...prev.seenPlaces, option.name],
      step: 'invite-friends',
    }))

    if (state.sessionId) {
      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', sessionId: state.sessionId, userASelection: option }),
      })
    }
  }

  const toggleFriendSelection = (friendId: string) => {
    setState((prev) => ({
      ...prev,
      selectedFriends: prev.selectedFriends.includes(friendId)
        ? prev.selectedFriends.filter((id) => id !== friendId)
        : [...prev.selectedFriends, friendId],
    }))
  }

  const addToCalendar = () => {
    if (!state.selectedOption || !state.preferences) return null
    const event = {
      title: `Meetup at ${state.selectedOption.name}`,
      description: `${state.preferences.activity} meetup\n${state.selectedOption.reason}\n\nAttendees: You${
        state.selectedFriends.length > 0 ? ` + ${state.selectedFriends.length} friends` : ''
      }`,
      location: state.selectedOption.address,
      startTime: new Date(`${new Date().toISOString().split('T')[0]}T${state.preferences.time}`),
      endTime: new Date(`${new Date().toISOString().split('T')[0]}T${state.preferences.time}`),
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

    const icalData = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${event.startTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${event.endTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:${event.title}
DESCRIPTION:${event.description.replace(/\n/g, '\\n')}
LOCATION:${event.location}
END:VEVENT
END:VCALENDAR`

    return { googleCalendarUrl, icalData }
  }

  const handleFinalize = async () => {
    if (!state.selectedOption || !state.preferences) return

    try {
      const response = await fetch('/api/meetups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          preferences: state.preferences,
          options: state.options,
          selectedOption: state.selectedOption,
          friendIds: state.selectedFriends,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create meetup')
      }

      setState((prev) => ({
        ...prev,
        step: 'confirmed',
      }))
    } catch (error) {
      console.error('Error creating meetup:', error)
      alert('Failed to create meetup. Please try again.')
    }
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
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-5xl font-black text-white mb-2 drop-shadow-lg">MeetUp AI</h1>
              <p className="text-white/80 text-lg">Plan your meetup</p>
            </div>
            <Link
              href="/dashboard"
              className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all"
            >
              ← Dashboard
            </Link>
          </div>

          {state.step === 'setup' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
                <h2 className="text-3xl font-bold text-white mb-6">Plan Your Meetup</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    handleSubmitPreferences({
                      location: formData.get('location') as string,
                      radius: Number(formData.get('radius')),
                      time: formData.get('time') as string,
                      activity: formData.get('activity') as string,
                    })
                  }}
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-white font-semibold mb-2">
                      <MapPin className="inline mr-2" size={20} />
                      Location
                    </label>
                    <input
                      name="location"
                      defaultValue="Dubai Marina"
                      className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white font-semibold mb-2">
                      <TrendingUp className="inline mr-2" size={20} />
                      Radius (km)
                    </label>
                    <input
                      name="radius"
                      type="number"
                      defaultValue="5"
                      className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white font-semibold mb-2">
                      <Clock className="inline mr-2" size={20} />
                      Time
                    </label>
                    <input
                      name="time"
                      type="time"
                      defaultValue="18:00"
                      className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white font-semibold mb-2">
                      <Zap className="inline mr-2" size={20} />
                      Activity
                    </label>
                    <input
                      name="activity"
                      defaultValue="coffee"
                      className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white font-semibold mb-2">
                      <Users className="inline mr-2" size={20} />
                      Invite Friends
                    </label>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 max-h-48 overflow-y-auto space-y-2">
                      {friends.length === 0 ? (
                        <p className="text-white/60 text-sm">No friends yet. <Link href="/friends?search=true" className="text-blue-400 underline">Find friends</Link></p>
                      ) : (
                        friends.map((friend) => (
                          <label
                            key={friend.id}
                            className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg"
                          >
                            <input
                              type="checkbox"
                              checked={state.selectedFriends.includes(friend.id)}
                              onChange={() => toggleFriendSelection(friend.id)}
                              className="w-5 h-5 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-2 focus:ring-blue-400"
                            />
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                              {(friend.name || friend.email)[0].toUpperCase()}
                            </div>
                            <span className="text-white">{friend.name || friend.email}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-2xl hover:shadow-blue-500/50 transition-all disabled:opacity-50"
                  >
                    {loading ? '🔍 Finding perfect spots...' : '✨ Get AI Recommendations'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {state.step === 'options' && state.options.length > 0 && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-white text-center mb-8">Choose Your Favorite</h2>
              <div
                className="relative h-[500px] perspective-1000"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {state.options.map((option, index) => {
                  const isActive = index === state.activeTile
                  const offset = index - state.activeTile
                  return (
                    <div
                      key={index}
                      className="absolute inset-0 transition-all duration-700 transform"
                      style={{
                        transform: `translateX(${offset * 100}%) translateZ(${
                          isActive ? '0px' : '-200px'
                        }) rotateY(${offset * 15}deg) scale(${isActive ? 1 : 0.85})`,
                        opacity: Math.abs(offset) > 1 ? 0 : 1,
                        zIndex: isActive ? 10 : 1,
                        pointerEvents: isActive ? 'auto' : 'none',
                      }}
                    >
                      <div className="bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-2xl rounded-3xl p-8 border-2 border-white/30 shadow-2xl h-full flex flex-col">
                        {option.isRecommended && (
                          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full inline-flex items-center gap-2 mb-4 w-fit">
                            <Star size={20} fill="white" />
                            <span className="font-bold">Top Pick</span>
                          </div>
                        )}
                        <h3 className="text-3xl font-black text-white mb-4">{option.name}</h3>
                        <div className="space-y-3 mb-6 flex-grow">
                          <p className="text-white/90 flex items-start gap-2">
                            <MapPin className="flex-shrink-0 mt-1" size={20} />
                            <span>{option.address}</span>
                          </p>
                          <p className="text-white/90 flex items-center gap-2">
                            <Star className="flex-shrink-0" size={20} fill="gold" stroke="gold" />
                            <span className="font-bold">{option.rating}/5.0</span>
                          </p>
                          <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4">
                            <p className="text-blue-200 font-semibold">💡 {option.popularity}</p>
                          </div>
                          <p className="text-white/80 italic">&quot;{option.reason}&quot;</p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleSelectOption(option)}
                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold hover:shadow-2xl hover:shadow-green-500/50 transition-all transform hover:scale-105"
                          >
                            ✓ Select This
                          </button>
                          <a
                            href={option.mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white/20 text-white px-6 py-4 rounded-xl font-bold hover:bg-white/30 transition-all flex items-center gap-2"
                          >
                            <MapPin size={20} /> Map
                          </a>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-center gap-3 mt-8">
                {state.options.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setState((prev) => ({ ...prev, activeTile: index }))}
                    className={`h-3 rounded-full transition-all ${
                      index === state.activeTile
                        ? 'w-12 bg-white'
                        : 'w-3 bg-white/40 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {state.step === 'invite-friends' && state.selectedOption && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
                <h2 className="text-3xl font-bold text-white mb-4">🎉 Activity Selected!</h2>
                <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl p-6 mb-6">
                  <p className="text-white text-lg mb-2">📍 {state.selectedOption.name}</p>
                  <p className="text-white/80 mb-3">{state.selectedOption.address}</p>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => {
                        const cal = addToCalendar()
                        if (cal) window.open(cal.googleCalendarUrl, '_blank')
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <Calendar size={20} /> Google Calendar
                    </button>
                    <button
                      onClick={() => {
                        const cal = addToCalendar()
                        if (cal) {
                          const blob = new Blob([cal.icalData], { type: 'text/calendar' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = 'meetup.ics'
                          a.click()
                        }
                      }}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-semibold transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <Calendar size={20} /> Apple/Outlook
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleFinalize}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-semibold hover:shadow-2xl hover:shadow-green-500/50 transition-all transform hover:scale-105"
                >
                  {state.selectedFriends.length > 0
                    ? `🎊 Continue with ${state.selectedFriends.length} Friend${
                        state.selectedFriends.length > 1 ? 's' : ''
                      }`
                    : '→ Continue Without Friends'}
                </button>
              </div>
            </div>
          )}

          {state.step === 'confirmed' && state.selectedOption && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-xl rounded-3xl p-12 border-2 border-green-400/50 text-center">
                <div className="text-7xl mb-6 animate-bounce">🎉</div>
                <h2 className="text-4xl font-black text-white mb-4">All Set!</h2>
                <p className="text-white text-xl mb-6">
                  Meetup at <span className="font-bold">{state.selectedOption.name}</span>
                </p>
                {state.selectedFriends.length > 0 && (
                  <p className="text-white/80 mb-4">
                    + {state.selectedFriends.length} friend{state.selectedFriends.length > 1 ? 's' : ''}{' '}
                    invited!
                  </p>
                )}
                <div className="space-y-3 mb-6">
                  <div className="bg-white/10 rounded-xl p-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="inline" />
                      <span>Calendar Event</span>
                    </div>
                    <button
                      onClick={() => {
                        const cal = addToCalendar()
                        if (cal) window.open(cal.googleCalendarUrl, '_blank')
                      }}
                      className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition-all text-sm"
                    >
                      Open Calendar
                    </button>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="inline" />
                      <span>Get Directions</span>
                    </div>
                    <button
                      onClick={() => window.open(state.selectedOption?.mapUrl, '_blank')}
                      className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-semibold transition-all text-sm"
                    >
                      Open Maps
                    </button>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  className="inline-block bg-white text-purple-900 px-8 py-3 rounded-xl font-bold hover:bg-white/90 transition-all"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
