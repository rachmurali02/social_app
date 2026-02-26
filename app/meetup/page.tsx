'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Calendar, MapPin, Clock, Users, Star, TrendingUp, Zap, Loader2, Crosshair } from 'lucide-react'
import Link from 'next/link'
import BottomNav from '../components/BottomNav'
import LocationAutocomplete from '../components/LocationAutocomplete'

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
  const [placeError, setPlaceError] = useState('')
  const [defaultLocation, setDefaultLocation] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const [visitedPlaces, setVisitedPlaces] = useState<string[]>([])
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
      fetch('/api/me/visited-places')
        .then((r) => r.json())
        .then((d) => setVisitedPlaces(d.placeNames || []))
        .catch(() => {})
    }
  }, [session])

  useEffect(() => {
    if (!session?.user?.id) return
    const init = async () => {
      const r = await fetch('/api/profile')
      const d = await r.json().catch(() => ({}))
      const profileLoc = d.profile?.location?.trim()
      if (profileLoc) {
        setDefaultLocation(profileLoc)
        return
      }
      if (!navigator.geolocation) return
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const rev = await fetch(
              `/api/geocode/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
            )
            const revd = await rev.json()
            if (revd.displayName) setDefaultLocation(revd.displayName)
          } catch {}
        },
        () => {}
      )
    }
    init()
  }, [session?.user?.id])

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
    setPlaceError('')
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
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: preferences.location,
          radiusKm: preferences.radius,
          activity: preferences.activity,
          excludeNames: [...new Set([...state.seenPlaces, ...visitedPlaces])],
        }),
      })

      const data = await response.json()
      let places = data.places || []

      if (!response.ok || places.length === 0) {
        throw new Error(data.error || data.message || 'No places found')
      }

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
      console.error('Error fetching places:', error)
      const msg: string =
        error instanceof Error ? error.message : 'No places found. Try a different location or larger radius.'
      setPlaceError(msg)
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
    const youName = session?.user?.name || session?.user?.email || 'You'
    const friendNames = state.selectedFriends
      .map((id) => friends.find((f) => f.id === id)?.name || friends.find((f) => f.id === id)?.email)
      .filter(Boolean)
    const attendeeList = [youName, ...friendNames].join(', ')
    const withLine = `With: ${attendeeList}`

    const event = {
      title: `Meetup at ${state.selectedOption.name}`,
      description: `${state.preferences.activity} meetup\n${state.selectedOption.reason}\n\n${withLine}`,
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
      <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <div className="text-neutral-600 text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-neutral-100">
      <div className="relative z-10 p-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-5xl font-black text-neutral-900 mb-2">MeetUp AI</h1>
              <p className="text-neutral-600 text-lg">Plan your meetup</p>
            </div>
            <Link
              href="/dashboard"
              className="glass-panel px-6 py-3 rounded-xl text-neutral-900 hover:shadow-md transition-all"
            >
              ← Dashboard
            </Link>
          </div>

          {state.step === 'setup' && (
            <div className="max-w-2xl mx-auto">
              <div className="glass-panel rounded-3xl p-8">
                <h2 className="text-3xl font-bold text-neutral-900 mb-6">Plan Your Meetup</h2>
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
                    <label className="block text-neutral-900 font-semibold mb-2">
                      <MapPin className="inline mr-2" size={20} />
                      Location
                    </label>
                    {placeError && (
                      <p className="text-amber-600 text-sm mb-2">{placeError}</p>
                    )}
                    <div className="flex gap-2">
                      <LocationAutocomplete
                        name="location"
                        key={defaultLocation}
                        defaultValue={defaultLocation || ''}
                        placeholder="e.g. Virginia, USA or Dubai Marina"
                        className="flex-1 p-4 rounded-xl bg-white border border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                        required
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!navigator.geolocation) return
                          setLocationLoading(true)
                          navigator.geolocation.getCurrentPosition(
                            async (pos) => {
                              try {
                                const r = await fetch(
                                  `/api/geocode/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
                                )
                                const d = await r.json()
                                if (d.displayName) setDefaultLocation(d.displayName)
                              } finally {
                                setLocationLoading(false)
                              }
                            },
                            () => setLocationLoading(false)
                          )
                        }}
                        disabled={locationLoading}
                        className="shrink-0 p-4 rounded-xl bg-white border border-neutral-200 text-neutral-900 hover:bg-neutral-50 disabled:opacity-50 flex items-center"
                        title="Use my location"
                      >
                        {locationLoading ? (
                          <Loader2 size={22} className="animate-spin" />
                        ) : (
                          <Crosshair size={22} />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-neutral-900 font-semibold mb-2">
                        <TrendingUp className="inline mr-2" size={20} />
                        Radius (km)
                      </label>
                      <input
                        name="radius"
                        type="number"
                        min="1"
                        max="50"
                        defaultValue="5"
                        className="w-full p-4 rounded-xl bg-white border border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-900 font-semibold mb-2">
                        <Clock className="inline mr-2" size={20} />
                        Time
                      </label>
                      <input
                        name="time"
                        type="time"
                        defaultValue="18:00"
                        className="w-full p-4 rounded-xl bg-white border border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-neutral-900 font-semibold mb-2">
                      <Zap className="inline mr-2" size={20} />
                      Activity
                    </label>
                    <input
                      name="activity"
                      defaultValue="coffee"
                      className="w-full p-4 rounded-xl bg-white border border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-900 font-semibold mb-2">
                      <Users className="inline mr-2" size={20} />
                      Invite Friends
                    </label>
                    <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 max-h-48 overflow-y-auto space-y-2">
                      {friends.length === 0 ? (
                        <p className="text-neutral-600 text-sm">No friends yet. <Link href="/discover" className="text-orange-600 underline">Discover people</Link></p>
                      ) : (
                        friends.map((friend) => (
                          <label
                            key={friend.id}
                            className="flex items-center gap-3 cursor-pointer hover:bg-neutral-100 p-2 rounded-lg"
                          >
                            <input
                              type="checkbox"
                              checked={state.selectedFriends.includes(friend.id)}
                              onChange={() => toggleFriendSelection(friend.id)}
                              className="w-5 h-5 rounded border-neutral-300 text-orange-500 focus:ring-2 focus:ring-orange-400"
                            />
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                              {(friend.name || friend.email)[0].toUpperCase()}
                            </div>
                            <span className="text-neutral-900">{friend.name || friend.email}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  {loading && (
                    <div className="flex flex-col items-center gap-3 py-4 text-neutral-600">
                      <Loader2 className="animate-spin" size={40} />
                      <p className="font-semibold">Finding spots...</p>
                      <p className="text-neutral-500 text-sm">Searching nearby for {state.preferences?.activity || 'places'}</p>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary py-4 text-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={22} />
                        Finding spots...
                      </>
                    ) : (
                      '✨ Find spots nearby'
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {state.step === 'options' && state.options.length > 0 && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-neutral-900 text-center mb-8">Where should we go?</h2>
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
                      <div className="glass-panel rounded-3xl p-8 shadow-xl h-full flex flex-col">
                        {option.isRecommended && (
                          <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-2 rounded-full inline-flex items-center gap-2 mb-4 w-fit">
                            <Star size={20} fill="white" />
                            <span className="font-bold">Top Pick</span>
                          </div>
                        )}
                        <h3 className="text-3xl font-black text-neutral-900 dark:text-white mb-4">{option.name}</h3>
                        <div className="space-y-3 mb-6 flex-grow">
                          <p className="text-neutral-700 dark:text-neutral-300 flex items-start gap-2">
                            <MapPin className="flex-shrink-0 mt-1" size={20} />
                            <span>{option.address}</span>
                          </p>
                          <p className="text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                            <Star className="flex-shrink-0" size={20} fill="gold" stroke="gold" />
                            <span className="font-bold">{Number(option.rating).toFixed(1)}/5.0</span>
                          </p>
                          <div className="bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4">
                            <p className="text-amber-800 dark:text-amber-200 font-semibold">💡 {option.popularity}</p>
                          </div>
                          <p className="text-neutral-600 dark:text-neutral-400 italic">&quot;{option.reason}&quot;</p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleSelectOption(option)}
                            className="flex-1 btn-primary py-4 transition-all transform hover:scale-105"
                          >
                            Select
                          </button>
                          <a
                            href={option.mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white px-6 py-4 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all flex items-center gap-2"
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
                        ? 'w-12 bg-orange-500'
                        : 'w-3 bg-neutral-300 dark:bg-neutral-600 hover:bg-neutral-400 dark:hover:bg-neutral-500'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {state.step === 'invite-friends' && state.selectedOption && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="glass-panel rounded-3xl p-8">
                <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">🎉 Activity Selected!</h2>
                <div className="bg-gradient-to-r from-orange-50 to-purple-50 dark:from-orange-900/30 dark:to-purple-900/30 rounded-2xl p-6 mb-6 border border-neutral-200 dark:border-neutral-600">
                  <p className="text-neutral-900 dark:text-white text-lg mb-2">📍 {state.selectedOption.name}</p>
                  <p className="text-neutral-600 dark:text-neutral-400 mb-3">{state.selectedOption.address}</p>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => {
                        const cal = addToCalendar()
                        if (cal) window.open(cal.googleCalendarUrl, '_blank')
                      }}
                      className="flex-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-700 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
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
                      className="flex-1 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <Calendar size={20} /> Apple/Outlook
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleFinalize}
                  className="w-full btn-primary py-4"
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
              <div className="glass-panel rounded-3xl p-12 text-center border-2 border-green-200 dark:border-green-700/50">
                <div className="text-7xl mb-6 animate-bounce">🎉</div>
                <h2 className="text-4xl font-black text-neutral-900 dark:text-white mb-4">All Set!</h2>
                <p className="text-neutral-700 dark:text-neutral-300 text-xl mb-6">
                  Meetup at <span className="font-bold">{state.selectedOption.name}</span>
                </p>
                {state.selectedFriends.length > 0 && (
                  <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                    + {state.selectedFriends.length} friend{state.selectedFriends.length > 1 ? 's' : ''}{' '}
                    invited!
                  </p>
                )}
                <div className="space-y-3 mb-6">
                  <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-4 text-neutral-900 dark:text-white flex items-center justify-between border border-neutral-200 dark:border-neutral-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="inline" />
                      <span>Calendar Event</span>
                    </div>
                    <button
                      onClick={() => {
                        const cal = addToCalendar()
                        if (cal) window.open(cal.googleCalendarUrl, '_blank')
                      }}
                      className="btn-primary px-4 py-2 text-sm"
                    >
                      Open Calendar
                    </button>
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-4 text-neutral-900 dark:text-white flex items-center justify-between border border-neutral-200 dark:border-neutral-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="inline" />
                      <span>Get Directions</span>
                    </div>
                    <button
                      onClick={() => window.open(state.selectedOption?.mapUrl, '_blank')}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all text-sm"
                    >
                      Open Maps
                    </button>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  className="inline-block btn-primary px-8 py-3"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
