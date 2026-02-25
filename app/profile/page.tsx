'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { User, ArrowLeft, Save, Lock, Eye, EyeOff, MapPin, Loader2, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [location, setLocation] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const locationFetchedOnMount = useRef(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '')
    }
  }, [session])

  useEffect(() => {
    if (session?.user?.id) {
      fetch('/api/profile')
        .then((r) => r.json())
        .then((d) => {
          setLocation(d.profile?.location || '')
          setAvatar(d.profile?.avatar || '')
        })
        .catch(() => {})
    }
  }, [session?.user?.id])

  useEffect(() => {
    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent)
    if (!isMobile || !session?.user?.id || locationFetchedOnMount.current) return
    locationFetchedOnMount.current = true
    if (!navigator.geolocation) return
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch(`/api/geocode/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
          const d = await r.json()
          if (d.displayName) setLocation(d.displayName)
        } finally {
          setLocationLoading(false)
        }
      },
      () => setLocationLoading(false)
    )
  }, [session?.user?.id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, location, avatar }),
      })
      if (response.ok) {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters')
      return
    }
    setPasswordLoading(true)
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setPasswordError(data.error || 'Failed to change password')
        return
      }
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordOpen(false)
    } catch (error) {
      console.error('Change password error:', error)
      setPasswordError('Something went wrong')
    } finally {
      setPasswordLoading(false)
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
    <div className="min-h-screen bg-neutral-950 p-4 sm:p-6 pb-safe">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 py-2 -mx-1 min-h-[44px] rounded-lg transition-all"
        >
          <ArrowLeft size={22} /> Back to Dashboard
        </Link>

        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-6 flex items-center gap-3">
            <User size={36} /> Profile
          </h1>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-20 h-20 rounded-2xl bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center">
                {avatar ? (
                  <img src={avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={36} className="text-white/50" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-white font-semibold mb-2 flex items-center gap-2">
                  <ImageIcon size={18} /> Profile picture URL
                </label>
                <input
                  type="url"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="w-full min-h-[48px] px-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div>
              <label className="block text-white font-semibold mb-2">Email</label>
              <input
                type="email"
                value={session.user?.email || ''}
                disabled
                className="w-full min-h-[48px] px-4 rounded-xl bg-white/5 border border-white/10 text-white/60 cursor-not-allowed text-base"
              />
            </div>

            <div>
              <label className="block text-white font-semibold mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full min-h-[48px] px-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-white font-semibold mb-2 flex items-center gap-2">
                <MapPin size={18} /> Location (used for meetup suggestions)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!navigator.geolocation) return
                    setLocationLoading(true)
                    navigator.geolocation.getCurrentPosition(
                      async (pos) => {
                        try {
                          const r = await fetch(
                            `/api/geocode/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
                          )
                          const d = await r.json()
                          if (d.displayName) setLocation(d.displayName)
                        } finally {
                          setLocationLoading(false)
                        }
                      },
                      () => setLocationLoading(false)
                    )
                  }}
                  disabled={locationLoading}
                  className="shrink-0 min-h-[48px] px-4 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 disabled:opacity-50 flex items-center justify-center gap-2 order-first sm:order-none"
                >
                  {locationLoading ? <Loader2 size={20} className="animate-spin" /> : <MapPin size={20} />}
                  Use my location
                </button>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="flex-1 min-h-[48px] px-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
                  placeholder="e.g. Dubai Marina, San Francisco"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-bold text-base hover:shadow-xl hover:shadow-blue-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={20} /> {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/20">
            <button
              type="button"
              onClick={() => setPasswordOpen((o) => !o)}
              className="w-full flex items-center justify-between min-h-[48px] px-4 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-base"
            >
              <span className="flex items-center gap-2">
                <Lock size={20} /> Change password
              </span>
              <span className="text-white/60">{passwordOpen ? '−' : '+'}</span>
            </button>

            {passwordOpen && (
              <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
                <div>
                  <label className="block text-white/90 text-sm mb-1">Current password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full min-h-[48px] px-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white/90 text-sm mb-1">New password</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full min-h-[48px] px-4 pr-12 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
                      placeholder="At least 6 characters"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                    >
                      {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-white/90 text-sm mb-1">Confirm new password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full min-h-[48px] px-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
                    placeholder="••••••••"
                    required
                  />
                </div>
                {passwordError && (
                  <p className="text-red-300 text-sm">{passwordError}</p>
                )}
                {passwordSuccess && (
                  <p className="text-green-300 text-sm">Password updated.</p>
                )}
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full min-h-[48px] bg-white/20 text-white py-3 rounded-xl font-semibold text-base border border-white/20 disabled:opacity-50"
                >
                  {passwordLoading ? 'Updating...' : 'Update password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
