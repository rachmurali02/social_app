'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { Users, ArrowLeft, Search, UserPlus, Loader2 } from 'lucide-react'
import Link from 'next/link'
import BottomNav from '../components/BottomNav'

function DiscoverContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [query, setQuery] = useState('')
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
    if (status === 'unauthenticated') router.push('/login')
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
    if (session?.user?.id) fetchDiscover()
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
            u.id === userId ? { ...u, friendshipStatus: 'pending', isSender: true } : u
          )
        )
      }
    } catch (error) {
      console.error('Add friend error:', error)
    } finally {
      setAddingId(null)
    }
  }

  const avatarGradient = (id: string) => {
    const h = (id.charCodeAt(0) * 17 + id.charCodeAt(1)) % 360
    return { background: `linear-gradient(135deg, hsl(${h}, 55%, 45%), hsl(${(h + 40) % 360}, 50%, 40%)` }
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
          <ArrowLeft size={22} /> Back
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-2 flex items-center gap-3">
            <Search size={28} /> Discover
          </h1>
          <p className="text-white/70 text-base">
            Search by name or email to find people to connect with.
          </p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={22} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full min-h-[48px] pl-12 pr-4 rounded-2xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-transparent text-base"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12 text-white/80">
            <Loader2 className="animate-spin" size={40} />
            <p>Loading...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-2xl border border-white/[0.08]">
            <Users className="mx-auto mb-4 text-white/40" size={64} />
            <p className="text-white/80 text-lg mb-2">
              {query ? 'No one matches your search' : 'Start typing to find people'}
            </p>
            <p className="text-white/60 text-sm">
              {query
                ? 'Try a different name or email'
                : 'Search for friends by name or email to add them'}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {users.map((user) => (
              <li
                key={user.id}
                className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-4 hover:bg-white/[0.08] transition-colors"
              >
                <Link href={`/profile/${user.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-12 h-12 rounded-full border border-white/20 overflow-hidden flex items-center justify-center shrink-0"
                    style={avatarGradient(user.id)}
                  >
                    {(user.profile as { avatar?: string })?.avatar ? (
                      <img src={(user.profile as { avatar: string }).avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-lg">
                        {(user.name || user.email)[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">{user.name || user.email}</p>
                    <p className="text-white/60 text-sm truncate">{user.email}</p>
                  </div>
                </Link>
                <div className="shrink-0">
                  {user.friendshipStatus === 'accepted' ? (
                    <span className="text-green-300 text-sm font-medium">Friends</span>
                  ) : user.friendshipStatus === 'pending' && user.isSender ? (
                    <span className="text-white/60 text-sm">Requested</span>
                  ) : user.friendshipStatus === 'pending' ? (
                    <Link href="/friends" className="text-amber-300 text-sm font-medium">
                      Accept in Friends
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddFriend(user.id)}
                      disabled={addingId === user.id}
                      className="min-h-[44px] px-4 flex items-center justify-center gap-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 font-medium"
                    >
                      {addingId === user.id ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <>
                          <UserPlus size={20} /> Invite
                        </>
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

export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-neutral-950 to-black">
          <div className="text-white text-xl">Loading...</div>
        </div>
      }
    >
      <DiscoverContent />
    </Suspense>
  )
}
