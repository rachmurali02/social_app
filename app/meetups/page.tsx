'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Calendar, MapPin, Clock, Users, ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import BottomNav from '../components/BottomNav'

type Meetup = {
  id: string
  status: string
  preferences: { location?: string; time?: string; activity?: string }
  selectedOption?: { name?: string; address?: string; mapUrl?: string }
  creator: { id: string; name: string | null; email: string }
  participants: { user: { id: string; name: string | null; email: string }; status: string }[]
}

function getPlacePhoto(placeName?: string, meetupId?: string) {
  const seed = (placeName || meetupId || 'meetup').replace(/[^a-zA-Z0-9]/g, '-')
  return `https://picsum.photos/seed/${seed}/800/300`
}

export default function MeetupsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [meetups, setMeetups] = useState<Meetup[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 p-4 sm:p-6 pb-24 pb-safe">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white mb-2 flex items-center gap-3">
          <Calendar size={28} /> Meetups
        </h1>
        <p className="text-neutral-600 dark:text-white/70 text-base mb-6">
          Your meetups and invitations
        </p>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12 text-neutral-500 dark:text-white/80">
            <Loader2 className="animate-spin" size={40} />
            <p>Loading meetups...</p>
          </div>
        ) : meetups.length === 0 ? (
          <div className="text-center py-12 glass-panel rounded-2xl">
            <Calendar className="mx-auto mb-4 text-neutral-300 dark:text-white/40" size={56} />
            <p className="text-neutral-600 dark:text-white/80 text-base mb-4">No meetups yet</p>
            <Link
              href="/meetup"
              className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 font-medium"
            >
              Create one <ChevronRight size={20} />
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {meetups.map((m) => {
              const placeName = (m.selectedOption as { name?: string })?.name || m.preferences?.activity || 'Meetup'
              const address = (m.selectedOption as { address?: string })?.address
              const time = m.preferences?.time
              const activity = m.preferences?.activity
              const isCreator = m.creator.id === session?.user?.id
              const myStatus = m.participants.find((p) => p.user.id === session?.user?.id)?.status

              return (
                <li key={m.id}>
                  <Link
                    href={`/meetups/${m.id}`}
                    className="group block glass-panel rounded-2xl overflow-hidden hover:bg-neutral-200/60 dark:hover:bg-white/[0.08] hover:shadow-card-hover transition-all duration-300"
                  >
                    <div className="relative h-36 sm:h-44 overflow-hidden">
                      <Image
                        src={getPlacePhoto(placeName, m.id)}
                        alt=""
                        fill
                        className="object-cover img-premium group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                      />
                      <div className="absolute inset-0 hero-overlay" />
                      <div className="absolute inset-0 hero-vignette" />
                      <div className="absolute bottom-3 left-4 right-4">
                        <h2 className="text-lg font-bold text-white truncate">{placeName}</h2>
                        <p className="text-white/90 text-sm truncate">{activity || 'Meetup'}</p>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                            m.status === 'confirmed'
                              ? 'bg-emerald-500/30 text-emerald-200'
                              : 'bg-amber-500/30 text-amber-200'
                          }`}
                        >
                          {m.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                          {isCreator && ' (created by you)'}
                          {!isCreator && myStatus && ` • ${myStatus}`}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        {address && (
                          <p className="text-neutral-600 dark:text-white/70 text-sm flex items-center gap-1 truncate">
                            <MapPin size={14} /> {address}
                          </p>
                        )}
                        {time && (
                          <p className="text-neutral-600 dark:text-white/70 text-sm flex items-center gap-1 mt-1">
                            <Clock size={14} /> {time}
                          </p>
                        )}
                        <p className="text-neutral-500 dark:text-white/60 text-sm flex items-center gap-1 mt-1">
                          <Users size={14} /> {m.participants.length} participant{m.participants.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <ChevronRight className="text-neutral-400 dark:text-white/50 shrink-0" size={24} />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
