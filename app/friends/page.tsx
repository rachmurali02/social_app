'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { Search, UserPlus, Check, X, Users } from 'lucide-react'

function FriendsContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isSearch = searchParams.get('search') === 'true'

  const [friends, setFriends] = useState<any[]>([])
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [friendRequests, setFriendRequests] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">Friends</h1>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/friends')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                !isSearch
                  ? 'bg-white text-purple-900'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Users className="inline mr-2" size={20} /> My Friends ({friends.length})
            </button>
            <button
              onClick={() => router.push('/friends?search=true')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                isSearch
                  ? 'bg-white text-purple-900'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Search className="inline mr-2" size={20} /> Find Friends
            </button>
          </div>
        </div>

        {friendRequests.length > 0 && (
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Friend Requests ({friendRequests.length})</h2>
            <div className="space-y-3">
              {friendRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                      {(request.sender.name || request.sender.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{request.sender.name || request.sender.email}</p>
                      <p className="text-white/60 text-sm">{request.sender.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptRequest(request.senderId)}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2"
                    >
                      <Check size={18} /> Accept
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(request.senderId)}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2"
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
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  handleSearch(e.target.value)
                }}
                placeholder="Search by name or email..."
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {loading && <div className="text-white/80 text-center py-8">Searching...</div>}

            {!loading && searchResults.length === 0 && searchQuery && (
              <div className="text-white/80 text-center py-8">No users found</div>
            )}

            <div className="space-y-3">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                      {(user.name || user.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{user.name || user.email}</p>
                      <p className="text-white/60 text-sm">{user.email}</p>
                      {user.friendshipStatus && (
                        <span className="text-xs text-white/50">
                          {user.friendshipStatus === 'pending'
                            ? user.isSender
                              ? 'Request sent'
                              : 'Request received'
                            : user.friendshipStatus === 'accepted'
                            ? 'Friends'
                            : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  {!user.friendshipStatus && (
                    <button
                      onClick={() => handleFriendRequest(user.id)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2"
                    >
                      <UserPlus size={18} /> Add Friend
                    </button>
                  )}
                  {user.friendshipStatus === 'pending' && user.isSender && (
                    <span className="text-white/60 text-sm">Request sent</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">My Friends ({friends.length})</h2>
            {friends.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto mb-4 text-white/40" size={64} />
                <p className="text-white/80 mb-4">You don&apos;t have any friends yet</p>
                <button
                  onClick={() => router.push('/friends?search=true')}
                  className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all"
                >
                  <Search size={20} /> Find Friends
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer"
                    onClick={() => router.push(`/profile/${friend.id}`)}
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
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function FriendsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
          <div className="text-white text-xl">Loading...</div>
        </div>
      }
    >
      <FriendsContent />
    </Suspense>
  )
}
