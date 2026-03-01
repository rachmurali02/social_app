'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { Users, ArrowLeft, Search, UserPlus, Loader2, Mail, Send, ChevronDown, ChevronUp } from 'lucide-react'
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

  // Invite non-user state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteNote, setInviteNote] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [inviteError, setInviteError] = useState('')

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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviteSending(true)
    setInviteStatus('idle')
    setInviteError('')
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), personalNote: inviteNote.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteError(data.error || 'Failed to send invite')
        setInviteStatus('error')
      } else {
        setInviteStatus('sent')
        setInviteEmail('')
        setInviteNote('')
      }
    } catch {
      setInviteError('Network error. Please try again.')
      setInviteStatus('error')
    } finally {
      setInviteSending(false)
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
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 p-4 sm:p-6 pb-24 pb-safe">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white mb-6 py-2 -mx-1 min-h-[44px] rounded-lg transition-colors"
        >
          <ArrowLeft size={22} /> Back
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white mb-2 flex items-center gap-3">
            <Search size={28} /> Discover
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-base">
            Search by name or email to find people to connect with.
          </p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" size={22} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full min-h-[48px] pl-12 pr-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:border-transparent text-base"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12 text-neutral-600 dark:text-neutral-400">
            <Loader2 className="animate-spin" size={40} />
            <p>Loading...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-2xl">
            <Users className="mx-auto mb-4 text-neutral-300 dark:text-neutral-600" size={64} />
            <p className="text-neutral-600 dark:text-neutral-400 text-lg mb-2">
              {query ? 'No one matches your search' : 'Start typing to find people'}
            </p>
            <p className="text-neutral-500 dark:text-neutral-500 text-sm">
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
                className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-4 hover:shadow-md transition-colors"
              >
                <Link href={`/profile/${user.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-12 h-12 rounded-full border border-neutral-200 overflow-hidden flex items-center justify-center shrink-0"
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
                    <p className="text-neutral-900 dark:text-white font-semibold truncate">{user.name || user.email}</p>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm truncate">{user.email}</p>
                  </div>
                </Link>
                <div className="shrink-0">
                  {user.friendshipStatus === 'accepted' ? (
                    <span className="text-green-600 dark:text-green-400 text-sm font-medium flex items-center gap-1">✓ Added</span>
                  ) : user.friendshipStatus === 'pending' && user.isSender ? (
                    <span className="text-neutral-500 dark:text-neutral-400 text-sm">Requested</span>
                  ) : user.friendshipStatus === 'pending' ? (
                    <Link href="/friends" className="text-amber-600 dark:text-amber-400 text-sm font-medium">
                      Accept in Friends
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddFriend(user.id)}
                      disabled={addingId === user.id}
                      className="min-h-[44px] px-4 flex items-center justify-center gap-2 rounded-xl btn-primary disabled:opacity-50"
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

        {/* Invite someone not on the app */}
        <div className="mt-8 glass-panel rounded-2xl overflow-hidden">
          <button
            onClick={() => { setInviteOpen((o) => !o); setInviteStatus('idle') }}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-100/60 dark:hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                <Mail size={18} className="text-orange-500" />
              </div>
              <div>
                <p className="text-neutral-900 dark:text-white font-semibold text-sm">Invite someone not on the app</p>
                <p className="text-neutral-500 dark:text-neutral-400 text-xs">Send them an email invite to join</p>
              </div>
            </div>
            {inviteOpen ? (
              <ChevronUp size={20} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
            ) : (
              <ChevronDown size={20} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
            )}
          </button>

          {inviteOpen && (
            <form onSubmit={handleInvite} className="px-4 pb-4 space-y-3 border-t border-neutral-200 dark:border-neutral-700 pt-4">
              {inviteStatus === 'sent' && (
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-xl text-sm font-medium">
                  ✓ Invite sent! They&apos;ll get an email with a link to join.
                </div>
              )}
              {inviteStatus === 'error' && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm">
                  {inviteError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Email address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="friend@example.com"
                  required
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-400/60 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Personal note <span className="text-neutral-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={inviteNote}
                  onChange={(e) => setInviteNote(e.target.value)}
                  placeholder="Hey, come join me on MeetUp AI!"
                  maxLength={300}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-400/60 text-sm resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={inviteSending || !inviteEmail.trim()}
                className="w-full min-h-[44px] btn-primary flex items-center justify-center gap-2 disabled:opacity-50 touch-manipulation"
              >
                {inviteSending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
                {inviteSending ? 'Sending…' : 'Send invite'}
              </button>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center">
                They&apos;ll get an email with a link to create a free account.
              </p>
            </form>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-950">
          <div className="text-neutral-600 dark:text-neutral-400 text-xl">Loading...</div>
        </div>
      }
    >
      <DiscoverContent />
    </Suspense>
  )
}
