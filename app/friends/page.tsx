'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { Search, UserPlus, Check, X, Users, ArrowLeft, Calendar } from 'lucide-react'
import Link from 'next/link'
import BottomNav from '../components/BottomNav'

function FriendsContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isSearch = searchParams?.get('search') === 'true'

  const [friends, setFriends] = useState<any[]>([])
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [friendRequests, setFriendRequests] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (isSearch) router.replace('/discover')
  }, [status, router, isSearch])

  useEffect(() => {
    if (session) {
      fetchFriends()
      fetchFriendRequests()
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

  const fetchFriendRequests = async () => {
    try {
      const response = await fetch('/api/friends?action=requests')
      const data = await response.json()
      setFriendRequests(data.requests || [])
    } catch (error) {
      console.error('Error fetching friend requests:', error)
    }
  }

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/friends?action=search&q=${encodeURIComponent(query)}`)
      const data = await response.json()
      setSearchResults(data.users || [])
    } catch (error) {
      console.error('Error searching:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFriendRequest = async (userId: string) => {
    try {
      await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', userId }),
      })
      handleSearch(searchQuery)
      fetchFriendRequests()
    } catch (error) {
      console.error('Error sending friend request:', error)
    }
  }

  const handleAcceptRequest = async (userId: string) => {
    try {
      await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', userId }),
      })
      fetchFriendRequests()
      fetchFriends()
    } catch (error) {
      console.error('Error accepting request:', error)
    }
  }

  const avatarGradient = (id: string) => {
    const h = (id.charCodeAt(0) * 17 + id.charCodeAt(1)) % 360
    return { background: `linear-gradient(135deg, hsl(${h}, 55%, 45%), hsl(${(h + 40) % 360}, 50%, 40%)` }
  }

  const handleDeclineRequest = async (userId: string) => {
    try {
      await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline', userId }),
      })
      fetchFriendRequests()
    } catch (error) {
      console.error('Error declining request:', error)
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
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 p-6 pb-24 lg:pl-60">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white mb-4 transition-all"
          >
            <ArrowLeft size={20} /> Back to Dashboard
          </Link>
          <h1 className="text-4xl font-black text-neutral-900 dark:text-white mb-2">My Crew</h1>
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl btn-primary"
          >
            <Search size={20} /> Discover
          </Link>
        </div>

        {friendRequests.length > 0 && (
          <div className="glass-panel rounded-3xl p-6 mb-6">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">Friend Requests ({friendRequests.length})</h2>
            <div className="space-y-3">
              {friendRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-600 flex items-center justify-center text-white font-bold shrink-0" style={avatarGradient(request.senderId)}>
                      {(request.sender.name || request.sender.email)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-neutral-900 dark:text-white font-semibold truncate">{request.sender.name || request.sender.email}</p>
                      <p className="text-neutral-500 dark:text-neutral-400 text-sm truncate">{request.sender.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAcceptRequest(request.senderId)}
                      className="flex-1 sm:flex-none min-h-[44px] bg-green-500 hover:bg-green-600 active:bg-green-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 touch-manipulation"
                    >
                      <Check size={18} /> Accept
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(request.senderId)}
                      className="flex-1 sm:flex-none min-h-[44px] bg-red-500 hover:bg-red-600 active:bg-red-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 touch-manipulation"
                    >
                      <X size={18} /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isSearch ? (
          <div className="glass-panel rounded-3xl p-8 text-center py-16">
            <p className="text-neutral-600 mb-4">Redirecting to Discover...</p>
            <Link href="/discover" className="text-orange-600 hover:underline">Go now</Link>
          </div>
        ) : (
          <div className="glass-panel rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Inner Circle ({friends.length})</h2>
            {friends.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto mb-4 text-neutral-300 dark:text-neutral-600" size={64} />
                <p className="text-neutral-600 dark:text-neutral-400 mb-4">You don&apos;t have any friends yet</p>
                <button
                  onClick={() => router.push('/discover')}
                  className="inline-flex items-center gap-2 btn-primary"
                >
                  <Search size={20} /> Discover
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="bg-white dark:bg-neutral-800/60 rounded-2xl p-4 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between hover:shadow-md transition-all"
                  >
                    <div
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => router.push(`/profile/${friend.id}`)}
                    >
                      <div
                        className="w-12 h-12 rounded-full border border-neutral-200 dark:border-neutral-600 overflow-hidden flex items-center justify-center shrink-0"
                        style={avatarGradient(friend.id || '')}
                      >
                        {friend.profile?.avatar ? (
                          <img src={friend.profile.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-bold text-lg">
                            {(friend.name || friend.email)[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-neutral-900 dark:text-white font-semibold truncate">{friend.name || friend.email}</p>
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm truncate">{friend.email}</p>
                      </div>
                    </div>
                    <Link
                      href={`/meetup?friend=${friend.id}`}
                      className="shrink-0 p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-orange-600 dark:text-amber-400 transition-colors"
                      title="Invite to meetup"
                    >
                      <Calendar size={20} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}

export default function FriendsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-950">
          <div className="text-neutral-600 dark:text-neutral-400 text-xl">Loading...</div>
        </div>
      }
    >
      <FriendsContent />
    </Suspense>
  )
}
