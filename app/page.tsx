'use client'

<<<<<<< HEAD
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (session) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }, [session, status, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      <div className="text-white text-xl">Loading...</div>
=======
import React, { useState, useEffect } from 'react'
import { Calendar, MapPin, Clock, Users, Star, TrendingUp, Zap } from 'lucide-react'

interface UserPreferences {
  location: string
  radius: number
  time: string
  activity: string
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
  step: 'setup' | 'options' | 'waiting' | 'confirmed' | 'declined' | 'invite-friends' | 'join-session' | 'view-selection'
  userRole: 'A' | 'B' | null
  preferences: UserPreferences | null
  options: PlaceOption[]
  selectedOption: PlaceOption | null
  backupOptions: PlaceOption[]
  attemptCount: number
  seenPlaces: string[]
  badges: string[]
  streak: number
  invitedFriends: string[]
  activeTile: number
  sessionId: string | null
}

export default function MeetupApp() {
  const [state, setState] = useState<AppState>({
    step: 'setup',
    userRole: null,
    preferences: null,
    options: [],
    selectedOption: null,
    backupOptions: [],
    attemptCount: 0,
    seenPlaces: [],
    badges: ['First Meet 🎉'],
    streak: 2,
    invitedFriends: [],
    activeTile: 0,
    sessionId: null,
  })

  const [loading, setLoading] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

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

  useEffect(() => {
    if (state.userRole === 'B' && state.sessionId && state.step === 'view-selection') {
      const pollSession = async () => {
        try {
          const response = await fetch(`/api/session?sessionId=${state.sessionId}`)
          const data = await response.json()
          if (data.session?.userASelection) {
            setState((prev) => ({
              ...prev,
              selectedOption: data.session.userASelection,
              preferences: data.session.preferences,
            }))
          }
        } catch (error) {
          console.error('Error polling session:', error)
        }
      }
      
      pollSession()
      const interval = setInterval(pollSession, 2000)
      return () => clearInterval(interval)
    }
  }, [state.userRole, state.sessionId, state.step])

  useEffect(() => {
    if (state.userRole === 'A' && state.sessionId && state.step === 'waiting') {
      const pollSession = async () => {
        try {
          const response = await fetch(`/api/session?sessionId=${state.sessionId}`)
          const data = await response.json()
          if (data.session?.userBConfirmed) {
            setState((prev) => ({ ...prev, step: 'invite-friends' }))
          }
        } catch (error) {
          console.error('Error polling session:', error)
        }
      }
      
      const interval = setInterval(pollSession, 2000)
      return () => clearInterval(interval)
    }
  }, [state.userRole, state.sessionId, state.step])

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

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const sessionParam = urlParams.get('session')
    if (sessionParam) {
      setState((prev) => ({ ...prev, sessionId: sessionParam }))
    }
  }, [])

  const selectRole = (role: 'A' | 'B') => {
    if (role === 'B') {
      const urlParams = new URLSearchParams(window.location.search)
      const sessionParam = urlParams.get('session')
      if (sessionParam) {
        setState((prev) => ({ ...prev, userRole: role, sessionId: sessionParam, step: 'view-selection' }))
      } else {
        setState((prev) => ({ ...prev, userRole: role, step: 'join-session' }))
      }
    } else {
      setState((prev) => ({ ...prev, userRole: role, step: 'setup' }))
    }
  }

  const handleSubmitPreferences = async (prefs: UserPreferences) => {
    setLoading(true)
    setState((prev) => ({ ...prev, preferences: prefs }))
    
    let sessionId = state.sessionId
    if (!sessionId) {
      const sessionResponse = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', preferences: prefs }),
      })
      const sessionData = await sessionResponse.json()
      sessionId = sessionData.sessionId
      setState((prev) => ({ ...prev, sessionId }))
    } else {
      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', sessionId, preferences: prefs }),
      })
    }

    try {
      const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
      if (!apiKey) {
        throw new Error('API key not configured')
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `Find 2 places for this activity:
Location: ${prefs.location}
Radius: ${prefs.radius}km
Time: ${prefs.time}
Activity: ${prefs.activity}
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
}]`,
            },
          ],
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        }),
      })

      const data = await response.json()
      let text = data.content.map((item: any) => (item.type === 'text' ? item.text : '')).join('\n')
      text = text.replace(/```json|```/g, '').trim()
      const places = JSON.parse(text)
      
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
      console.error('Error:', error)
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
      step: state.userRole === 'A' ? 'waiting' : 'confirmed',
    }))
    
    if (state.userRole === 'A' && state.sessionId) {
      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', sessionId: state.sessionId, userASelection: option }),
      })
    }
  }

  const handleDecline = async () => {
    setLoading(true)
    const currentOptions = state.options.map((o) => o.name)
    const allSeenPlaces = [...state.seenPlaces, ...currentOptions]
    try {
      const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
      if (!apiKey) {
        throw new Error('API key not configured')
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `Find 2 FRESH/NEW places (different from before):
Location: ${state.preferences?.location}
Radius: ${state.preferences?.radius}km
Time: ${state.preferences?.time}
Activity: ${state.preferences?.activity}
EXCLUDE THESE: ${allSeenPlaces.join(', ')}
Return ONLY valid JSON with 2 completely different venues.`,
            },
          ],
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        }),
      })

      const data = await response.json()
      let text = data.content.map((item: any) => (item.type === 'text' ? item.text : '')).join('\n')
      text = text.replace(/```json|```/g, '').trim()
      const places = JSON.parse(text)
      setState((prev) => ({
        ...prev,
        options: places,
        step: 'options',
        attemptCount: prev.attemptCount + 1,
        seenPlaces: allSeenPlaces,
        activeTile: 0,
      }))
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  const handleConfirm = () => {
    setState((prev) => ({ ...prev, step: 'invite-friends' }))
  }

  const handleInviteFriend = (friendEmail: string) => {
    setState((prev) => ({
      ...prev,
      invitedFriends: [...prev.invitedFriends, friendEmail],
    }))
  }

  const addToCalendar = () => {
    if (!state.selectedOption || !state.preferences) return null
    const event = {
      title: `Meetup at ${state.selectedOption.name}`,
      description: `${state.preferences.activity} meetup\n${state.selectedOption.reason}\n\nAttendees: You${
        state.invitedFriends.length > 0 ? ` + ${state.invitedFriends.length} friends` : ''
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

  const handleFinalize = () => {
    setState((prev) => ({
      ...prev,
      step: 'confirmed',
      badges: [...prev.badges, '3 Outings This Month 🎊'],
    }))
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
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-white mb-2 drop-shadow-lg">MeetUp AI</h1>
          <p className="text-white/80 text-lg">Smart social coordination powered by AI</p>
          <div className="flex justify-center gap-4 mt-4">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
              <span className="text-white font-semibold">🔥 {state.streak} week streak</span>
            </div>
            {state.badges.map((badge, i) => (
              <div
                key={i}
                className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20"
              >
                <span className="text-white">{badge}</span>
              </div>
            ))}
          </div>
        </div>

        {!state.userRole && (
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl font-bold text-white text-center mb-6">Choose Your Role</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => selectRole('A')}
                className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-8 rounded-3xl font-bold text-xl hover:scale-105 transition-transform shadow-2xl"
              >
                <Users className="mx-auto mb-2" size={40} />
                User A<br />
                <span className="text-sm font-normal">(Organizer)</span>
              </button>
              <button
                onClick={() => selectRole('B')}
                className="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-8 rounded-3xl font-bold text-xl hover:scale-105 transition-transform shadow-2xl"
              >
                <Users className="mx-auto mb-2" size={40} />
                User B<br />
                <span className="text-sm font-normal">(Responder)</span>
              </button>
            </div>
          </div>
        )}

        {state.userRole === 'B' && state.step === 'join-session' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
              <h2 className="text-3xl font-bold text-white mb-6">Join Session</h2>
              <p className="text-white/80 mb-6">
                Enter the session ID that User A shared with you
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  const sessionId = formData.get('sessionId') as string
                  
                  setLoading(true)
                  try {
                    const response = await fetch(`/api/session?sessionId=${sessionId}`)
                    const data = await response.json()
                    
                    if (data.session) {
                      if (data.session.userASelection) {
                        setState((prev) => ({
                          ...prev,
                          sessionId,
                          step: 'view-selection',
                          selectedOption: data.session.userASelection,
                          preferences: data.session.preferences,
                        }))
                      } else if (data.session.options?.length > 0) {
                        setState((prev) => ({
                          ...prev,
                          sessionId,
                          step: 'options',
                          options: data.session.options,
                          preferences: data.session.preferences,
                          activeTile: 0,
                        }))
                      } else {
                        setState((prev) => ({
                          ...prev,
                          sessionId,
                          step: 'view-selection',
                          preferences: data.session.preferences,
                        }))
                      }
                    } else {
                      alert('Session not found. Please check the session ID.')
                    }
                  } catch (error) {
                    console.error('Error joining session:', error)
                    alert('Error joining session. Please try again.')
                  }
                  setLoading(false)
                }}
                className="space-y-5"
              >
                <div>
                  <label className="block text-white font-semibold mb-2">Session ID</label>
                  <input
                    name="sessionId"
                    placeholder="Enter session ID"
                    className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all disabled:opacity-50"
                >
                  {loading ? 'Joining...' : 'Join Session'}
                </button>
              </form>
            </div>
          </div>
        )}

        {state.userRole === 'B' && state.step === 'view-selection' && state.selectedOption && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
              <h2 className="text-3xl font-bold text-white mb-4">User A Selected:</h2>
              <div className="bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-2xl rounded-3xl p-8 border-2 border-white/30 shadow-2xl mb-6">
                <h3 className="text-3xl font-black text-white mb-4">{state.selectedOption.name}</h3>
                <div className="space-y-3">
                  <p className="text-white/90 flex items-start gap-2">
                    <MapPin className="flex-shrink-0 mt-1" size={20} />
                    <span>{state.selectedOption.address}</span>
                  </p>
                  <p className="text-white/90 flex items-center gap-2">
                    <Star className="flex-shrink-0" size={20} fill="gold" stroke="gold" />
                    <span className="font-bold">{state.selectedOption.rating}/5.0</span>
                  </p>
                  <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4">
                    <p className="text-blue-200 font-semibold">💡 {state.selectedOption.popularity}</p>
                  </div>
                  <p className="text-white/80 italic">&quot;{state.selectedOption.reason}&quot;</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    await fetch('/api/session', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'update', sessionId: state.sessionId, userBConfirmed: true }),
                    })
                    setState((prev) => ({ ...prev, step: 'confirmed' }))
                  }}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold hover:shadow-2xl hover:shadow-green-500/50 transition-all transform hover:scale-105"
                >
                  ✓ Confirm & Continue
                </button>
                <a
                  href={state.selectedOption.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/20 text-white px-6 py-4 rounded-xl font-bold hover:bg-white/30 transition-all flex items-center gap-2"
                >
                  <MapPin size={20} /> Map
                </a>
              </div>
            </div>
          </div>
        )}

        {state.userRole === 'A' && state.step === 'setup' && (
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
            <h2 className="text-3xl font-bold text-white text-center mb-8">
              {state.userRole === 'A' ? 'Choose Your Favorite' : 'Pick One to Continue'}
            </h2>
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
            {state.userRole === 'B' && (
              <div className="text-center mt-6">
                <button
                  onClick={handleDecline}
                  disabled={loading}
                  className="bg-red-500/80 hover:bg-red-600 text-white px-8 py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
                >
                  {loading ? '🔄 Finding new options...' : '✗ See Different Options'}
                </button>
              </div>
            )}
          </div>
        )}

        {state.step === 'waiting' && state.selectedOption && state.sessionId && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20">
              <div className="text-6xl mb-4 animate-bounce">⏳</div>
              <h2 className="text-3xl font-bold text-white mb-4">Waiting for User B...</h2>
              <p className="text-white/80 text-lg mb-6">
                You selected: <span className="font-bold">{state.selectedOption.name}</span>
              </p>
              <div className="bg-white/10 rounded-xl p-6 mb-6">
                <p className="text-white/80 mb-3">Share this session ID with User B:</p>
                <div className="bg-white/20 rounded-lg p-4 mb-4">
                  <code className="text-2xl font-bold text-white">{state.sessionId}</code>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(state.sessionId || '')
                    alert('Session ID copied to clipboard!')
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold transition-all"
                >
                  Copy Session ID
                </button>
                <p className="text-white/60 text-sm mt-4">
                  Or share this link: <br />
                  <span className="text-blue-300 break-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}?session=${state.sessionId}` : ''}
                  </span>
                </p>
              </div>
              <div className="animate-pulse text-white/60">Waiting for User B to confirm...</div>
            </div>
          </div>
        )}

        {state.step === 'invite-friends' && state.selectedOption && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
              <h2 className="text-3xl font-bold text-white mb-4">🎉 Activity Confirmed!</h2>
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
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-4">Invite More Friends</h3>
                <p className="text-white/70 mb-4">
                  Make it a group activity! 85% of group outings get rated higher.
                </p>
                <div className="space-y-3">
                  {['friend1@email.com', 'friend2@email.com', 'friend3@email.com'].map((friend) => (
                    <button
                      key={friend}
                      onClick={() => handleInviteFriend(friend)}
                      disabled={state.invitedFriends.includes(friend)}
                      className={`w-full p-4 rounded-xl border-2 transition-all transform ${
                        state.invitedFriends.includes(friend)
                          ? 'bg-green-500/20 border-green-400 cursor-not-allowed scale-95'
                          : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40 hover:scale-105'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white">{friend}</span>
                        {state.invitedFriends.includes(friend) ? (
                          <span className="text-green-400 font-bold">✓ Invited</span>
                        ) : (
                          <span className="text-white/60">+ Invite</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleFinalize}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-semibold hover:shadow-2xl hover:shadow-green-500/50 transition-all transform hover:scale-105"
              >
                {state.invitedFriends.length > 0
                  ? `🎊 Continue with ${state.invitedFriends.length} Friend${
                      state.invitedFriends.length > 1 ? 's' : ''
                    }`
                  : '→ Continue Without Inviting'}
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
              {state.invitedFriends.length > 0 && (
                <p className="text-white/80 mb-4">
                  + {state.invitedFriends.length} friend{state.invitedFriends.length > 1 ? 's' : ''}{' '}
                  invited!
                </p>
              )}
              <div className="space-y-3">
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
              <button
                onClick={() => window.location.reload()}
                className="mt-8 bg-white text-purple-900 px-8 py-3 rounded-xl font-bold hover:bg-white/90 transition-all"
              >
                Plan Another Meetup
              </button>
            </div>
          </div>
        )}
      </div>
>>>>>>> origin/main
    </div>
  )
}
