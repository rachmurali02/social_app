'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Users, User, LogOut, Calendar, Search, UserPlus, Bell } from 'lucide-react'
import Link from 'next/link'
import BottomNav from '../components/BottomNav'
import ThemeToggle from '../components/ThemeToggle'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [friends, setFriends] = useState<any[]>([])
  const [pendingInvitations, setPendingInvitations] = useState(0)
  const [nextMeetup, setNextMeetup] = useState<{ id: string; status: string; preferences?: { time?: string; activity?: string }; selectedOption?: { name?: string } } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchFriends()
      fetchPendingInvitations()
      fetchNextMeetup()
    }
  }, [session])

  const fetchFriends = async () => {
    try {
      const response = await fetch('/api/friends?action=list')
      const data = await response.json()
      setFriends(data.friends || [])
    } catch (error) {
      console.error('Error fetching friends:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingInvitations = async () => {
    try {
      const response = await fetch('/api/meetups?type=invitations')
      const data = await response.json()
      setPendingInvitations(data.invitations?.length || 0)
    } catch (error) {
      console.error('Error fetching invitations:', error)
    }
  }

  const fetchNextMeetup = async () => {
    try {
      const response = await fetch('/api/meetups')
      const data = await response.json()
      const meetups = (data.meetups || []).filter((m: { status: string }) => m.status !== 'cancelled')
      setNextMeetup(meetups[0] || null)
    } catch (error) {
      console.error('Error fetching meetups:', error)
    }
  }

  const avatarGradient = (id: string) => {
    const h = (id.charCodeAt(0) * 17 + id.charCodeAt(1)) % 360
    return { background: `linear-gradient(135deg, hsl(${h}, 55%, 45%), hsl(${(h + 40) % 360}, 50%, 40%)` }
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-950">
        <div className="text-neutral-600 dark:text-neutral-400 text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-neutral-100 dark:bg-neutral-950">
      <div className="relative z-10 p-4 sm:p-6 pt-[max(1rem,env(safe-area-inset-top))] pb-24 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-neutral-900 dark:text-white mb-1 sm:mb-2 truncate">Loom</h1>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base truncate">Hello, {session.user?.name || session.user?.email}!</p>
            </div>
            <div className="flex gap-2 sm:gap-4 shrink-0">
              <ThemeToggle />
              <Link
                href="/profile"
                className="flex-1 sm:flex-none min-h-[44px] glass-panel px-4 sm:px-6 py-3 rounded-2xl text-neutral-900 dark:text-white hover:bg-white dark:hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base font-medium"
              >
                <User size={20} /> Profile
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex-1 sm:flex-none min-h-[44px] glass-panel px-4 sm:px-6 py-3 rounded-2xl text-neutral-900 dark:text-white hover:bg-white dark:hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base font-medium"
              >
                <LogOut size={20} /> Logout
              </button>
            </div>
          </div>

          <Link
            href="/meetup"
            className="block mb-6 sm:mb-8"
          >
            <div className="group glass-panel rounded-2xl sm:rounded-3xl p-6 sm:p-8 hover:shadow-lg transition-all duration-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:-translate-y-0.5 bg-gradient-to-r from-orange-500/15 to-purple-500/15 dark:from-orange-500/25 dark:to-purple-500/25 border border-orange-200/60 dark:border-orange-500/30">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-white shrink-0">
                  <Calendar size={28} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-white mb-0.5">Plan Meetup</h2>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                    {nextMeetup
                      ? `${(nextMeetup.selectedOption as { name?: string })?.name || nextMeetup.preferences?.activity || 'Meetup'} ${nextMeetup.preferences?.time ? `at ${nextMeetup.preferences.time}` : ''}`
                      : 'Create a new meetup with friends'}
                  </p>
                </div>
              </div>
              <span className="text-orange-600 dark:text-orange-400 text-sm font-semibold group-hover:underline">Get started →</span>
            </div>
          </Link>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6 sm:mb-8">
            <Link
              href="/invitations"
              className="group glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-8 hover:shadow-lg transition-all duration-300 relative min-h-[120px] sm:min-h-0 flex flex-col justify-center hover:-translate-y-0.5"
            >
              <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-3 group-hover:bg-amber-200 dark:group-hover:bg-amber-900/70 transition-colors">
                <Bell className="text-amber-600 dark:text-amber-400" size={22} />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 dark:text-white mb-1">Invitations</h2>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">View pending invitations</p>
              {pendingInvitations > 0 && (
                <div className="absolute top-4 right-4 bg-rose-500 text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-semibold text-xs shadow-lg shadow-rose-500/30">
                  {pendingInvitations}
                </div>
              )}
            </Link>

            <Link
              href="/friends"
              className="group glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-8 hover:shadow-lg transition-all duration-300 min-h-[120px] sm:min-h-0 flex flex-col justify-center hover:-translate-y-0.5"
            >
              <div className="w-11 h-11 rounded-2xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center mb-3 group-hover:bg-violet-200 dark:group-hover:bg-violet-900/70 transition-colors">
                <Users className="text-violet-600 dark:text-violet-400" size={22} />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 dark:text-white mb-1">Friends</h2>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">Manage your friends list</p>
            </Link>

            <Link
              href="/discover"
              className="group glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-8 hover:shadow-lg transition-all duration-300 min-h-[120px] sm:min-h-0 flex flex-col justify-center hover:-translate-y-0.5"
            >
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-3 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/70 transition-colors">
                <Search className="text-emerald-600 dark:text-emerald-400" size={22} />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 dark:text-white mb-1">Discover</h2>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">Find and add new friends</p>
            </Link>
          </div>

          <div className="glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
              <Users size={28} /> Your Friends ({friends.length})
            </h2>
            {loading ? (
              <div className="text-neutral-600 dark:text-neutral-400">Loading friends...</div>
            ) : friends.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto mb-4 text-neutral-300" size={64} />
                <p className="text-neutral-600 dark:text-neutral-400 mb-4">You don&apos;t have any friends yet</p>
                <Link
                  href="/discover"
                  className="inline-flex items-center gap-2 btn-primary"
                >
                  <UserPlus size={20} /> Discover
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {friends.map((friend) => (
                  <Link
                    key={friend.id}
                    href={`/profile/${friend.id}`}
                    className="bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl p-4 border border-neutral-200 dark:border-neutral-700 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full border border-neutral-200 dark:border-neutral-600 overflow-hidden flex items-center justify-center shrink-0" style={avatarGradient(friend.id || '')}>
                        {friend.profile?.avatar ? (
                          <img src={friend.profile.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-bold text-lg">
                            {(friend.name || friend.email)[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-neutral-900 dark:text-white font-semibold">{friend.name || friend.email}</p>
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm">{friend.email}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
