'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Users, User, LogOut, Calendar, Search, UserPlus, Bell } from 'lucide-react'
import Link from 'next/link'

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      <div className="relative z-10 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-5xl font-black text-white mb-2 drop-shadow-lg">MeetUp AI</h1>
              <p className="text-white/80">Welcome back, {session.user?.name || session.user?.email}!</p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/profile"
                className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all flex items-center gap-2"
              >
                <User size={20} /> Profile
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all flex items-center gap-2"
              >
                <LogOut size={20} /> Logout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link
              href="/meetup"
              className="bg-gradient-to-br from-blue-500/20 to-blue-700/20 backdrop-blur-xl rounded-3xl p-8 border border-white/20 hover:scale-105 transition-transform"
            >
              <Calendar className="text-white mb-4" size={48} />
              <h2 className="text-2xl font-bold text-white mb-2">Plan Meetup</h2>
              <p className="text-white/80">Create a new meetup with friends</p>
            </Link>

            <Link
              href="/invitations"
              className="bg-gradient-to-br from-yellow-500/20 to-orange-700/20 backdrop-blur-xl rounded-3xl p-8 border border-white/20 hover:scale-105 transition-transform relative"
            >
              <Bell className="text-white mb-4" size={48} />
              <h2 className="text-2xl font-bold text-white mb-2">Invitations</h2>
              <p className="text-white/80">View pending invitations</p>
              {pendingInvitations > 0 && (
                <div className="absolute top-4 right-4 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                  {pendingInvitations}
                </div>
              )}
            </Link>

            <Link
              href="/friends"
              className="bg-gradient-to-br from-purple-500/20 to-purple-700/20 backdrop-blur-xl rounded-3xl p-8 border border-white/20 hover:scale-105 transition-transform"
            >
              <Users className="text-white mb-4" size={48} />
              <h2 className="text-2xl font-bold text-white mb-2">Friends</h2>
              <p className="text-white/80">Manage your friends list</p>
            </Link>

            <Link
              href="/friends?search=true"
              className="bg-gradient-to-br from-pink-500/20 to-pink-700/20 backdrop-blur-xl rounded-3xl p-8 border border-white/20 hover:scale-105 transition-transform"
            >
              <Search className="text-white mb-4" size={48} />
              <h2 className="text-2xl font-bold text-white mb-2">Find Friends</h2>
              <p className="text-white/80">Search and add new friends</p>
            </Link>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Users size={28} /> Your Friends ({friends.length})
            </h2>
            {loading ? (
              <div className="text-white/80">Loading friends...</div>
            ) : friends.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto mb-4 text-white/40" size={64} />
                <p className="text-white/80 mb-4">You don't have any friends yet</p>
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
                    className="bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                        {(friend.name || friend.email)[0].toUpperCase()}
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
    </div>
  )
}
