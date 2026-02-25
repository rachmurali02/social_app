'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { Users, ArrowLeft, Search, UserPlus, Loader2 } from 'lucide-react'
import Link from 'next/link'
import BottomNav from '../components/BottomNav'

function CommunityContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams?.get('q') || '')
  const [users, setUsers] = useState<Array<{
    id: string
    email: string
    name: string | null
    profile: unknown
    friendshipStatus: string | null
    isSender: boolean
  }>>([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const fetchDiscover = useCallback(async () => {
    setLoading(true)
    try {
      const url = query
        ? `/api/friends?action=discover&q=${encodeURIComponent(query)}`
        : '/api/friends?action=discover'
      const response = await fetch(url)
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Discover error:', error)
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    if (session?.user?.id) {
      fetchDiscover()
    }
  }, [session?.user?.id, fetchDiscover])

  const handleAddFriend = async (userId: string) => {
    setAddingId(userId)
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', userId }),
      })
      if (response.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, friendshipStatus: 'pending', isSender: true }
              : u
          )
        )
      }
    } catch (error) {
      console.error('Add friend error:', error)
    } finally {
      setAddingId(null)
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
    <div className="min-h-screen bg-neutral-950 p-4 sm:p-6 pb-24 pb-safe">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 py-2 -mx-1 min-h-[44px] rounded-lg transition-colors"
        >
          <ArrowLeft size={22} /> Back to Dashboard
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-2 flex items-center gap-3">
            <Users size={28} /> Community
          </h1>
          <p className="text-white/70 text-base">
            Find people to connect with and plan meetups.
          </p>
        </div>

        <div className="relative mb-6">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50"
            size={22}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="w-full min-h-[48px] pl-12 pr-4 rounded-2xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-transparent text-base"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12 text-white/80">
            <Loader2 className="animate-spin" size={40} />
            <p>Loading community...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
            <Users className="mx-auto mb-4 text-white/40" size={56} />
            <p className="text-white/80 text-base">
              {query ? 'No one matches your search.' : 'No other members yet. Invite friends to join!'}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {users.map((user) => (
              <li
                key={user.id}
                className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-4 hover:bg-white/[0.08] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {(user.name || user.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">
                      {user.name || user.email}
                    </p>
                    <p className="text-white/60 text-sm truncate">{user.email}</p>
                  </div>
                </div>
                <div className="shrink-0">
                  {user.friendshipStatus === 'accepted' ? (
                    <span className="text-green-300 text-sm font-medium">
                      Friends
                    </span>
                  ) : user.friendshipStatus === 'pending' && user.isSender ? (
                    <span className="text-white/60 text-sm">Requested</span>
                  ) : user.friendshipStatus === 'pending' ? (
                    <Link
                      href="/invitations"
                      className="text-amber-300 text-sm font-medium"
                    >
                      Accept in Invitations
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddFriend(user.id)}
                      disabled={addingId === user.id}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
                    >
                      {addingId === user.id ? (
                        <Loader2 size={22} className="animate-spin" />
                      ) : (
                        <UserPlus size={22} />
                      )}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <BottomNav />
    </div>
  )
}

export default function CommunityPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-neutral-950 to-black">
          <div className="text-white text-xl">Loading...</div>
        </div>
      }
    >
      <CommunityContent />
    </Suspense>
  )
}
