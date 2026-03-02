'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { User, ArrowLeft, Calendar, MapPin, Clock, ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import BottomNav from '../../components/BottomNav'
import { classifyActivity, getActivityPhotoUrl, CATEGORY_EMOJI } from '../../../lib/activityPhoto'

type Meetup = {
  id: string
  status: string
  preferences: { location?: string; time?: string; activity?: string }
  selectedOption?: { name?: string; address?: string; mapUrl?: string }
  creator: { id: string; name: string | null; email: string }
  participants: { user: { id: string; name: string | null; email: string }; status: string }[]
}

type UserProfile = {
  user: {
    id: string
    name: string | null
    email: string
    profile?: { avatar?: string | null; location?: string | null }
  }
  pastMeetups: Meetup[]
  upcomingMeetups: Meetup[]
}

function MeetupCard({ m }: { m: Meetup }) {
  const placeName = (m.selectedOption as { name?: string })?.name || m.preferences?.activity || 'Meetup'
  const address = (m.selectedOption as { address?: string })?.address
  const time = m.preferences?.time
  const activity = m.preferences?.activity
  const category = classifyActivity(activity)
  const photoUrl = getActivityPhotoUrl(category, 400, 200)
  const emoji = CATEGORY_EMOJI[category]

  return (
    <Link
      href={`/meetups/${m.id}`}
      className="block glass-panel rounded-2xl overflow-hidden hover:bg-neutral-200/60 dark:hover:bg-white/[0.08] transition-all"
    >
      <div className="relative h-24 overflow-hidden">
        <Image
          src={photoUrl}
          alt={activity || 'Meetup'}
          fill
          sizes="(max-width: 640px) 50vw, 300px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
          <div className="min-w-0">
            <h3 className="text-white font-semibold truncate drop-shadow text-sm">{placeName}</h3>
            <p className="text-white/80 text-xs capitalize">{activity || 'Meetup'}</p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1 ml-2">
            <span className="text-lg">{emoji}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                m.status === 'confirmed' ? 'bg-black/40 text-emerald-200' : 'bg-black/30 text-amber-100'
              }`}
            >
              {m.status === 'confirmed' ? 'Confirmed' : 'Pending'}
            </span>
          </div>
        </div>
      </div>
      <div className="p-3 space-y-1">
        {address && (
          <p className="text-neutral-600 dark:text-white/70 text-xs flex items-center gap-1 truncate">
            <MapPin size={12} /> {address}
          </p>
        )}
        {time && (
          <p className="text-neutral-600 dark:text-white/70 text-xs flex items-center gap-1">
            <Clock size={12} /> {time}
          </p>
        )}
      </div>
    </Link>
  )
}

export default function UserProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [data, setData] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (session?.user?.id && id) {
      if (id === session.user.id) {
        router.replace('/profile')
        return
      }
      fetch(`/api/users/${id}`)
        .then((r) => {
          if (!r.ok) throw new Error(r.status === 404 ? 'User not found' : 'Failed to load')
          return r.json()
        })
        .then(setData)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    }
  }, [session?.user?.id, id, router])

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-950">
        <div className="text-neutral-600 dark:text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-neutral-100 dark:bg-neutral-950">
        <Loader2 className="animate-spin text-neutral-400 dark:text-white" size={40} />
        <p className="text-neutral-500 dark:text-white/80">Loading profile...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-neutral-600 dark:text-white/80">{error || 'User not found'}</p>
        <Link href="/friends" className="text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300">
          Back to Friends
        </Link>
      </div>
    )
  }

  const { user, pastMeetups, upcomingMeetups } = data
  const avatar = user.profile?.avatar
  const location = user.profile?.location

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 p-4 sm:p-6 pb-24 pb-safe lg:pl-60">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/friends"
          className="inline-flex items-center gap-2 text-neutral-700 dark:text-white/90 hover:text-neutral-900 dark:hover:text-white mb-6 py-2 -mx-1 transition-colors"
        >
          <ArrowLeft size={22} /> Back
        </Link>

        <div className="glass-panel rounded-3xl p-6 sm:p-8 mb-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-20 h-20 rounded-2xl bg-neutral-200 dark:bg-white/10 border border-neutral-300 dark:border-white/20 overflow-hidden flex items-center justify-center">
              {avatar ? (
                <img src={avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-neutral-400 dark:text-white/50" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-white truncate">
                {user.name || user.email}
              </h1>
              <p className="text-neutral-500 dark:text-white/60 text-sm truncate">{user.email}</p>
              {location && (
                <p className="text-neutral-600 dark:text-white/70 text-sm mt-1 flex items-center gap-1">
                  <MapPin size={14} /> {location}
                </p>
              )}
            </div>
          </div>
        </div>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
            <Calendar size={20} /> Upcoming
          </h2>
          {upcomingMeetups.length === 0 ? (
            <div className="glass-panel rounded-2xl p-6 text-center text-neutral-500 dark:text-white/60 text-sm">
              No upcoming meetups
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {upcomingMeetups.map((m) => (
                <MeetupCard key={m.id} m={m} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
            <Calendar size={20} /> Past
          </h2>
          {pastMeetups.length === 0 ? (
            <div className="glass-panel rounded-2xl p-6 text-center text-neutral-500 dark:text-white/60 text-sm">
              No past meetups
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {pastMeetups.map((m) => (
                <MeetupCard key={m.id} m={m} />
              ))}
            </div>
          )}
        </section>
      </div>
      <BottomNav />
    </div>
  )
}
