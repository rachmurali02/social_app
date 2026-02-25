'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Users, User, LogOut, Calendar, Search, UserPlus, Bell, Heart } from 'lucide-react'
import Link from 'next/link'
import BottomNav from '../components/BottomNav'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [friends, setFriends] = useState<any[]>([])
  const [pendingInvitations, setPendingInvitations] = useState(0)
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

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-neutral-950 to-black">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-neutral-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[url('/images/party-dashboard-hero.jpg')] bg-cover bg-center scale-105 img-premium" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-neutral-950/95" />
        <div className="absolute inset-0 hero-vignette" />
      </div>
      <div className="relative z-10 p-4 sm:p-6 pt-[max(1rem,env(safe-area-inset-top))] pb-24 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mb-1 sm:mb-2 truncate">MeetUp AI</h1>
              <p className="text-white/70 text-sm sm:text-base truncate">Welcome back, {session.user?.name || session.user?.email}!</p>
            </div>
            <div className="flex gap-2 sm:gap-4 shrink-0">
              <Link
                href="/profile"
                className="flex-1 sm:flex-none min-h-[44px] glass-panel px-4 sm:px-6 py-3 rounded-2xl text-white hover:bg-white/[0.08] transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base font-medium"
              >
                <User size={20} /> Profile
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex-1 sm:flex-none min-h-[44px] glass-panel px-4 sm:px-6 py-3 rounded-2xl text-white hover:bg-white/[0.08] transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base font-medium"
              >
                <LogOut size={20} /> Logout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6 sm:mb-8">
            <Link
              href="/meetup"
              className="group glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-8 hover:bg-white/[0.09] hover:shadow-card-hover transition-all duration-300 min-h-[120px] sm:min-h-0 flex flex-col justify-center hover:-translate-y-0.5"
            >
              <div className="w-11 h-11 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-3 group-hover:bg-blue-500/30 transition-colors">
                <Calendar className="text-blue-300" size={22} />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-1">Plan Meetup</h2>
              <p className="text-white/60 text-sm">Create a new meetup with friends</p>
            </Link>

            <Link
              href="/invitations"
              className="group glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-8 hover:bg-white/[0.09] hover:shadow-card-hover transition-all duration-300 relative min-h-[120px] sm:min-h-0 flex flex-col justify-center hover:-translate-y-0.5"
            >
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-3 group-hover:bg-amber-500/30 transition-colors">
                <Bell className="text-amber-300" size={22} />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-1">Invitations</h2>
              <p className="text-white/60 text-sm">View pending invitations</p>
              {pendingInvitations > 0 && (
                <div className="absolute top-4 right-4 bg-rose-500 text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-semibold text-xs shadow-lg shadow-rose-500/30">
                  {pendingInvitations}
                </div>
              )}
            </Link>

            <Link
              href="/friends"
              className="group glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-8 hover:bg-white/[0.09] hover:shadow-card-hover transition-all duration-300 min-h-[120px] sm:min-h-0 flex flex-col justify-center hover:-translate-y-0.5"
            >
              <div className="w-11 h-11 rounded-2xl bg-violet-500/20 flex items-center justify-center mb-3 group-hover:bg-violet-500/30 transition-colors">
                <Users className="text-violet-300" size={22} />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-1">Friends</h2>
              <p className="text-white/60 text-sm">Manage your friends list</p>
            </Link>

            <Link
              href="/friends?search=true"
              className="group glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-8 hover:bg-white/[0.09] hover:shadow-card-hover transition-all duration-300 min-h-[120px] sm:min-h-0 flex flex-col justify-center hover:-translate-y-0.5"
            >
              <div className="w-11 h-11 rounded-2xl bg-pink-500/20 flex items-center justify-center mb-3 group-hover:bg-pink-500/30 transition-colors">
                <Search className="text-pink-300" size={22} />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-1">Find Friends</h2>
              <p className="text-white/60 text-sm">Search and add new friends</p>
            </Link>

            <Link
              href="/community"
              className="group glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-8 hover:bg-white/[0.09] hover:shadow-card-hover transition-all duration-300 min-h-[120px] sm:min-h-0 flex flex-col justify-center hover:-translate-y-0.5"
            >
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-3 group-hover:bg-emerald-500/30 transition-colors">
                <Heart className="text-emerald-300" size={22} />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-1">Community</h2>
              <p className="text-white/60 text-sm">Discover and connect with others</p>
            </Link>
          </div>

          <div className="glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
              <Users size={28} /> Your Friends ({friends.length})
            </h2>
            {loading ? (
              <div className="text-white/80">Loading friends...</div>
            ) : friends.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto mb-4 text-white/40" size={64} />
                <p className="text-white/80 mb-4">You don&apos;t have any friends yet</p>
                <Link
                  href="/friends?search=true"
                  className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all"
                >
                  <UserPlus size={20} /> Find Friends
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {friends.map((friend) => (
                  <Link
                    key={friend.id}
                    href={`/profile/${friend.id}`}
                    className="bg-white/[0.04] hover:bg-white/[0.08] rounded-2xl p-4 border border-white/[0.06] transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center shrink-0">
                        {friend.profile?.avatar ? (
                          <img src={friend.profile.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-bold text-lg">
                            {(friend.name || friend.email)[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-white font-semibold">{friend.name || friend.email}</p>
                        <p className="text-white/60 text-sm">{friend.email}</p>
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
