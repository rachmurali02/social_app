'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar, MapPin, Clock, Users, Star, TrendingUp, Zap, Loader2, Crosshair, PenLine, AlertTriangle, X, PlusCircle } from 'lucide-react'
import Link from 'next/link'
import BottomNav from '../components/BottomNav'
import LocationAutocomplete from '../components/LocationAutocomplete'

interface UserPreferences {
  location: string
  radius: number
  time: string
  date: string
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

function MeetupPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefilledFriendId = searchParams?.get('friend') || null
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
    selectedFriends: prefilledFriendId ? [prefilledFriendId] : [],
  })

  const [loading, setLoading] = useState(false)
  const [placeError, setPlaceError] = useState('')
  const [defaultLocation, setDefaultLocation] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const [visitedPlaces, setVisitedPlaces] = useState<string[]>([])
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  // Smart defaults: round current time up to next 30-min slot, today's date
  const smartDefaults = (() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() < 30 ? 30 : 60, 0, 0)
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const yyyy = now.getFullYear()
    const mo = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    return { time: `${hh}:${mm}`, date: `${yyyy}-${mo}-${dd}` }
  })()

  const [existingMeetups, setExistingMeetups] = useState<Array<{ date?: string; time?: string; placeName?: string }>>([])
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)
  const [conflictDismissed, setConflictDismissed] = useState(false)
  const [formDate, setFormDate] = useState(smartDefaults.date)
  const [formTime, setFormTime] = useState(smartDefaults.time)
  const [showCustomPlace, setShowCustomPlace] = useState(false)
  const [customPlaceName, setCustomPlaceName] = useState('')
  const [customPlaceAddress, setCustomPlaceAddress] = useState('')

  const ACTIVITY_CHIPS = [
    { label: '☕ Coffee', value: 'coffee' },
    { label: '🍽 Food', value: 'food' },
    { label: '🍻 Drinks', value: 'drinks' },
    { label: '🍦 Dessert', value: 'dessert' },
    { label: '🎳 Bowling', value: 'bowling' },
    { label: '🎬 Cinema', value: 'cinema' },
    { label: '🏃 Outdoors', value: 'outdoors' },
    { label: '🛍 Shopping', value: 'shopping' },
    { label: '🎮 Gaming', value: 'gaming' },
    { label: '🎭 Arts', value: 'arts' },
    { label: '💪 Fitness', value: 'fitness' },
    { label: '✏️ Custom', value: '_custom' },
  ]

  const [selectedActivity, setSelectedActivity] = useState('coffee')
  const [customActivity, setCustomActivity] = useState('')

  const checkConflict = (date: string, time: string) => {
    if (!date || !time) return null
    const proposed = new Date(`${date}T${time}`)
    for (const m of existingMeetups) {
      if (!m.date || !m.time) continue
      const existing = new Date(`${m.date}T${m.time}`)
      const diffMs = Math.abs(proposed.getTime() - existing.getTime())
      if (diffMs < 30 * 60 * 1000) {
        const label = m.placeName ? `"${m.placeName}"` : 'another meetup'
        const timeStr = new Date(`${m.date}T${m.time}`).toLocaleString([], {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        })
        return `You already have ${label} at ${timeStr} within 30 minutes of this time.`
      }
    }
    return null
  }

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
      fetch('/api/meetups')
        .then((r) => r.json())
        .then((d) => {
          const upcoming = (d.meetups || []).filter((m: { status: string }) => m.status !== 'cancelled')
          const mapped = upcoming.map((m: { preferences?: { date?: string; time?: string }; selectedOption?: { name?: string } }) => ({
            date: m.preferences?.date,
            time: m.preferences?.time,
            placeName: (m.selectedOption as { name?: string } | undefined)?.name,
          }))
          setExistingMeetups(mapped)
          // Check conflict against current form defaults once meetups load
          const warn = mapped.reduce((found: string | null, m: { date?: string; time?: string; placeName?: string }) => {
            if (found || !m.date || !m.time) return found
            const proposed = new Date(`${smartDefaults.date}T${smartDefaults.time}`)
            const existing = new Date(`${m.date}T${m.time}`)
            if (Math.abs(proposed.getTime() - existing.getTime()) < 30 * 60 * 1000) {
              const label = m.placeName ? `"${m.placeName}"` : 'another meetup'
              const timeStr = existing.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              return `You already have ${label} at ${timeStr} within 30 minutes of this time.`
            }
            return null
          }, null)
          if (warn) setConflictWarning(warn)
        })
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
    setTouchEnd(e.targetTouches[0].clientX)
    setIsSwiping(false)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const current = e.targetTouches[0].clientX
    setTouchEnd(current)
    if (Math.abs(current - touchStart) > 10) setIsSwiping(true)
  }

  const handleTouchEnd = () => {
    const delta = touchStart - touchEnd
    if (Math.abs(delta) < 50) {
      setIsSwiping(false)
      return
    }
    if (delta > 50) {
      setState((prev) => ({
        ...prev,
        activeTile: (prev.activeTile + 1) % prev.options.length,
      }))
    } else if (delta < -50) {
      setState((prev) => ({
        ...prev,
        activeTile: prev.activeTile === 0 ? prev.options.length - 1 : prev.activeTile - 1,
      }))
    }
    setIsSwiping(false)
  }

  const handleSubmitPreferences = async (prefs: Partial<UserPreferences>) => {
    setLoading(true)
    setPlaceError('')
    const preferences: UserPreferences = {
      location: prefs.location || '',
      radius: prefs.radius || 5,
      time: prefs.time || smartDefaults.time,
      date: prefs.date || smartDefaults.date,
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
          time: preferences.time,
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

    const dateStr = state.preferences.date || new Date().toISOString().split('T')[0]
    const timeStr = state.preferences.time || '18:00'

    const startTime = new Date(`${dateStr}T${timeStr}`)
    const endTime = new Date(startTime)
    endTime.setHours(endTime.getHours() + 2)

    // Format as local time (no Z) so Google Calendar keeps the time as-is in the user's timezone
    const fmtLocal = (d: Date) => [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
      'T',
      String(d.getHours()).padStart(2, '0'),
      String(d.getMinutes()).padStart(2, '0'),
      '00',
    ].join('')
    const title = `Meetup at ${state.selectedOption.name}`
    const description = `${state.preferences.activity} meetup\n${state.selectedOption.reason}\n\n${withLine}`

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmtLocal(startTime)}/${fmtLocal(endTime)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(state.selectedOption.address)}`

    const icalData = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${fmtLocal(startTime)}\nDTEND:${fmtLocal(endTime)}\nSUMMARY:${title}\nDESCRIPTION:${description.replace(/\n/g, '\\n')}\nLOCATION:${state.selectedOption.address}\nEND:VEVENT\nEND:VCALENDAR`

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
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-950">
        <div className="text-neutral-600 dark:text-neutral-400 text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-neutral-100 dark:bg-neutral-950 lg:pl-56 pr-20 sm:pr-16">
      <div className="relative z-10 p-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center gap-4 mb-8">
            <div className="min-w-0 flex-1">
              <h1 className="text-5xl font-black text-neutral-900 dark:text-white mb-2 truncate">Loom</h1>
              <p className="text-neutral-600 dark:text-neutral-400 text-lg">Plan your meetup</p>
            </div>
            <Link
              href="/dashboard"
              className="shrink-0 glass-panel px-6 py-3 rounded-xl text-neutral-900 dark:text-white hover:shadow-md transition-all"
            >
              ← Dashboard
            </Link>
            <div className="lg:hidden w-20 shrink-0" aria-hidden />
          </div>

          {state.step === 'setup' && (
            <div className="max-w-2xl mx-auto">
              <div className="glass-panel rounded-3xl p-8">
                <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-6">Plan Your Meetup</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    const activity = selectedActivity === '_custom'
                      ? (customActivity.trim() || 'meetup')
                      : selectedActivity
                    handleSubmitPreferences({
                      location: formData.get('location') as string,
                      radius: Number(formData.get('radius')),
                      time: formData.get('time') as string,
                      date: formData.get('date') as string,
                      activity,
                    })
                  }}
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-neutral-900 dark:text-neutral-100 font-semibold mb-2">
                      <MapPin className="inline mr-2" size={20} />
                      Location
                    </label>
                    {placeError && (
                      <p className="text-amber-600 text-sm mb-2">{placeError}</p>
                    )}
                    <div className="relative">
                      <LocationAutocomplete
                        name="location"
                        key={defaultLocation}
                        defaultValue={defaultLocation || ''}
                        placeholder="e.g. Virginia, USA or Dubai Marina"
                        className="w-full p-4 pr-14 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-400"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-neutral-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors touch-manipulation"
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
                        title="Use my location"
                      >
                        {locationLoading ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : (
                          <Crosshair size={20} />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-neutral-900 dark:text-neutral-100 font-semibold mb-2">
                        <TrendingUp className="inline mr-2" size={20} />
                        Radius (km)
                      </label>
                      <input
                        name="radius"
                        type="number"
                        min="1"
                        max="50"
                        defaultValue="5"
                        className="w-full p-4 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-900 dark:text-neutral-100 font-semibold mb-2">
                        <Calendar className="inline mr-2" size={20} />
                        Date
                      </label>
                      <input
                        name="date"
                        type="date"
                        value={formDate}
                        min={smartDefaults.date}
                        onChange={(e) => {
                          setFormDate(e.target.value)
                          setConflictDismissed(false)
                          setConflictWarning(checkConflict(e.target.value, formTime))
                        }}
                        className="w-full p-4 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-900 dark:text-neutral-100 font-semibold mb-2">
                        <Clock className="inline mr-2" size={20} />
                        Time
                      </label>
                      <input
                        name="time"
                        type="time"
                        value={formTime}
                        onChange={(e) => {
                          setFormTime(e.target.value)
                          setConflictDismissed(false)
                          setConflictWarning(checkConflict(formDate, e.target.value))
                        }}
                        className="w-full p-4 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-400"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-neutral-900 dark:text-neutral-100 font-semibold mb-2">
                      <Zap className="inline mr-2" size={20} />
                      Activity
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ACTIVITY_CHIPS.map((chip) => (
                        <button
                          key={chip.value}
                          type="button"
                          onClick={() => setSelectedActivity(chip.value)}
                          className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border touch-manipulation ${
                            selectedActivity === chip.value
                              ? 'bg-orange-500 border-orange-500 text-white shadow-md'
                              : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-orange-400 dark:hover:border-orange-500'
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                    {selectedActivity === '_custom' && (
                      <div className="mt-3 flex items-center gap-2">
                        <PenLine size={18} className="text-neutral-400 shrink-0" />
                        <input
                          type="text"
                          value={customActivity}
                          onChange={(e) => setCustomActivity(e.target.value)}
                          placeholder="e.g. mini golf, karaoke, escape room…"
                          className="flex-1 p-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-neutral-900 dark:text-neutral-100 font-semibold mb-2">
                      <Users className="inline mr-2" size={20} />
                      Invite Friends
                    </label>
                    <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 max-h-48 overflow-y-auto space-y-2">
                      {friends.length === 0 ? (
                        <p className="text-neutral-600 dark:text-neutral-400 text-sm">No friends yet. <Link href="/discover" className="text-orange-500 underline">Discover people</Link></p>
                      ) : (
                        friends.map((friend) => (
                          <label
                            key={friend.id}
                            className="flex items-center gap-3 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700/50 p-2 rounded-lg"
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
                            <span className="text-neutral-900 dark:text-neutral-100">{friend.name || friend.email}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  {conflictWarning && !conflictDismissed && (
                    <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-600 rounded-xl p-4">
                      <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                      <div className="flex-1 text-sm text-amber-800 dark:text-amber-200">
                        <p className="font-semibold mb-0.5">Scheduling conflict</p>
                        <p>{conflictWarning}</p>
                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">You can still proceed — just click the button below to continue anyway.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConflictDismissed(true)}
                        className="text-amber-500 hover:text-amber-700 shrink-0 touch-manipulation"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                  {loading && (
                    <div className="flex flex-col items-center gap-3 py-4 text-neutral-600 dark:text-neutral-400">
                      <Loader2 className="animate-spin" size={40} />
                      <p className="font-semibold">Finding spots...</p>
                      <p className="text-neutral-500 dark:text-neutral-500 text-sm">Searching nearby for {state.preferences?.activity || 'places'}</p>
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
              <h2 className="text-3xl font-bold text-neutral-900 dark:text-white text-center mb-8">Where should we go?</h2>
              <div
                className="relative h-[460px] sm:h-[500px] perspective-1000"
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
                            onPointerUp={(e) => {
                              e.stopPropagation()
                              if (!isSwiping) handleSelectOption(option)
                            }}
                            className="flex-1 btn-primary py-5 text-lg transition-all active:scale-95 touch-manipulation"
                          >
                            Select
                          </button>
                          <a
                            href={option.mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onPointerUp={(e) => e.stopPropagation()}
                            className="bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white px-6 py-5 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-600 active:scale-95 transition-all flex items-center gap-2 touch-manipulation"
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
                    className="p-2 touch-manipulation flex items-center justify-center"
                    aria-label={`Go to option ${index + 1}`}
                  >
                    <span
                      className={`block h-3 rounded-full transition-all ${
                        index === state.activeTile
                          ? 'w-12 bg-orange-500'
                          : 'w-3 bg-neutral-300 dark:bg-neutral-600'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Custom place override */}
              <div className="max-w-xl mx-auto mt-6">
                {!showCustomPlace ? (
                  <button
                    onClick={() => setShowCustomPlace(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400 hover:border-orange-400 hover:text-orange-500 dark:hover:border-orange-500 dark:hover:text-orange-400 transition-colors text-sm font-medium touch-manipulation"
                  >
                    <PlusCircle size={16} /> None of these? Enter your own place
                  </button>
                ) : (
                  <div className="glass-panel rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-neutral-900 dark:text-white text-sm">Enter your own place</p>
                      <button
                        onClick={() => setShowCustomPlace(false)}
                        className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 touch-manipulation"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Place name (e.g. Blue Bottle Coffee)"
                      value={customPlaceName}
                      onChange={(e) => setCustomPlaceName(e.target.value)}
                      className="w-full p-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Address (optional)"
                      value={customPlaceAddress}
                      onChange={(e) => setCustomPlaceAddress(e.target.value)}
                      className="w-full p-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                    />
                    <button
                      disabled={!customPlaceName.trim()}
                      onClick={() => {
                        if (!customPlaceName.trim()) return
                        handleSelectOption({
                          name: customPlaceName.trim(),
                          address: customPlaceAddress.trim() || '',
                          rating: 0,
                          popularity: '',
                          reason: 'Manually chosen',
                          mapUrl: customPlaceAddress.trim()
                            ? `https://www.google.com/maps/search/${encodeURIComponent(customPlaceName.trim() + ' ' + customPlaceAddress.trim())}`
                            : `https://www.google.com/maps/search/${encodeURIComponent(customPlaceName.trim())}`,
                        })
                        setShowCustomPlace(false)
                        setCustomPlaceName('')
                        setCustomPlaceAddress('')
                      }}
                      className="w-full btn-primary py-3 text-sm disabled:opacity-50 touch-manipulation"
                    >
                      Use this place
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {state.step === 'invite-friends' && state.selectedOption && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="glass-panel rounded-3xl p-8">
                <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">🎉 Activity Selected!</h2>
                <div className="bg-gradient-to-r from-orange-50 to-purple-50 dark:from-orange-900/30 dark:to-purple-900/30 rounded-2xl p-6 mb-6 border border-neutral-200 dark:border-neutral-600">
                  <p className="text-neutral-900 dark:text-white text-lg mb-1">📍 {state.selectedOption.name}</p>
                  <p className="text-neutral-600 dark:text-neutral-400 mb-1">{state.selectedOption.address}</p>
                  {state.preferences?.date && state.preferences?.time && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                      🗓 {new Date(`${state.preferences.date}T${state.preferences.time}`).toLocaleDateString(undefined, {
                        weekday: 'short', month: 'short', day: 'numeric',
                      })}{' '}at{' '}
                      {new Date(`${state.preferences.date}T${state.preferences.time}`).toLocaleTimeString(undefined, {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <button
                      onClick={() => {
                        const cal = addToCalendar()
                        if (cal) window.open(cal.googleCalendarUrl, '_blank')
                      }}
                      className="flex-1 min-w-0 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-700 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <Calendar size={20} className="shrink-0" /> <span className="truncate">Google Calendar</span>
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
                      className="flex-1 min-w-0 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <Calendar size={20} className="shrink-0" /> <span className="truncate">Apple/Outlook</span>
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
                <p className="text-neutral-700 dark:text-neutral-300 text-xl mb-2">
                  Meetup at <span className="font-bold">{state.selectedOption.name}</span>
                </p>
                {state.preferences?.date && state.preferences?.time && (
                  <p className="text-neutral-500 dark:text-neutral-400 text-base mb-4">
                    {new Date(`${state.preferences.date}T${state.preferences.time}`).toLocaleDateString(undefined, {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })}{' '}at{' '}
                    {new Date(`${state.preferences.date}T${state.preferences.time}`).toLocaleTimeString(undefined, {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                )}
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
                      <span>Add to Calendar</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const cal = addToCalendar()
                          if (cal) window.open(cal.googleCalendarUrl, '_blank')
                        }}
                        className="btn-primary px-4 py-2 text-sm"
                      >
                        Google
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
                        className="bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white px-4 py-2 rounded-lg font-semibold transition-all text-sm"
                      >
                        .ics
                      </button>
                    </div>
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

export default function MeetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-950"><div className="text-neutral-600 dark:text-neutral-400 text-xl">Loading...</div></div>}>
      <MeetupPageContent />
    </Suspense>
  )
}
