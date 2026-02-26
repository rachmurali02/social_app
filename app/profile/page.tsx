'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { User, ArrowLeft, Save, Lock, Eye, EyeOff, MapPin, Loader2, Image as ImageIcon, Upload } from 'lucide-react'
import Link from 'next/link'
import ThemeToggle from '../components/ThemeToggle'

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resizeAndConvertToBase64 = (file: File, maxSize = 400): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Please select an image file (JPEG, PNG, etc.)'))
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let { width, height } = img
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round((height * maxSize) / width)
              width = maxSize
            } else {
              width = Math.round((width * maxSize) / height)
              height = maxSize
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve((e.target?.result as string) || '')
            return
          }
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.85))
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await resizeAndConvertToBase64(file)
      setAvatar(dataUrl)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to process image')
    }
    e.target.value = ''
  }

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
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-950">
        <div className="text-neutral-600 dark:text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 p-4 sm:p-6 pb-safe">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white py-2 -mx-1 min-h-[44px] rounded-lg transition-colors"
          >
            <ArrowLeft size={22} /> Back
          </Link>
          <ThemeToggle />
        </div>

        <div className="glass-panel rounded-3xl p-6 sm:p-8 dark:bg-white/5 dark:border-white/10">
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white mb-6 flex items-center gap-3">
            <User size={36} /> Profile
          </h1>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="shrink-0 w-20 h-20 rounded-2xl bg-neutral-200 dark:bg-white/10 border border-neutral-200 dark:border-white/20 overflow-hidden flex items-center justify-center relative group">
                {avatar ? (
                  <img src={avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={36} className="text-neutral-400 dark:text-white/50" />
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Upload size={24} className="text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0 min-h-[44px] px-4 rounded-xl bg-neutral-200 dark:bg-white/10 border border-neutral-200 dark:border-white/20 hover:bg-neutral-300 dark:hover:bg-white/20 text-neutral-900 dark:text-white flex items-center gap-2 text-sm font-medium"
                  >
                    <Upload size={18} /> Upload photo
                  </button>
                </div>
                <label className="block text-neutral-600 dark:text-neutral-400 text-sm">or paste URL</label>
                <input
                  type="url"
                  value={avatar?.startsWith('data:') ? '' : avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-white dark:bg-white/10 border border-neutral-200 dark:border-white/20 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-400 text-base"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div>
              <label className="block text-neutral-900 dark:text-white font-semibold mb-2">Email</label>
              <input
                type="email"
                value={session.user?.email || ''}
                disabled
                className="w-full min-h-[48px] px-4 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-500 dark:text-neutral-400 cursor-not-allowed text-base"
              />
            </div>

            <div>
              <label className="block text-neutral-900 dark:text-white font-semibold mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full min-h-[48px] px-4 rounded-xl bg-white dark:bg-white/10 border border-neutral-200 dark:border-white/20 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-400 text-base"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-neutral-900 dark:text-white font-semibold mb-2 flex items-center gap-2">
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
                  className="shrink-0 min-h-[48px] px-4 rounded-xl bg-neutral-200 dark:bg-white/10 border border-neutral-200 dark:border-white/20 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-white/20 disabled:opacity-50 flex items-center justify-center gap-2 order-first sm:order-none"
                >
                  {locationLoading ? <Loader2 size={20} className="animate-spin" /> : <MapPin size={20} />}
                  Use my location
                </button>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="flex-1 min-h-[48px] px-4 rounded-xl bg-white dark:bg-white/10 border border-neutral-200 dark:border-white/20 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-400 text-base"
                  placeholder="e.g. Dubai Marina, San Francisco"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] btn-primary py-3 text-base disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={20} /> {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-neutral-200 dark:border-white/20">
            <button
              type="button"
              onClick={() => setPasswordOpen((o) => !o)}
              className="w-full flex items-center justify-between min-h-[48px] px-4 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white font-semibold text-base"
            >
              <span className="flex items-center gap-2">
                <Lock size={20} /> Change password
              </span>
              <span className="text-neutral-500 dark:text-neutral-400">{passwordOpen ? '−' : '+'}</span>
            </button>

            {passwordOpen && (
              <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 text-sm mb-1">Current password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full min-h-[48px] px-4 rounded-xl bg-white dark:bg-white/10 border border-neutral-200 dark:border-white/20 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-400 text-base"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 text-sm mb-1">New password</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full min-h-[48px] px-4 pr-12 rounded-xl bg-white dark:bg-white/10 border border-neutral-200 dark:border-white/20 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-400 text-base"
                      placeholder="At least 6 characters"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                    >
                      {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 text-sm mb-1">Confirm new password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full min-h-[48px] px-4 rounded-xl bg-white dark:bg-white/10 border border-neutral-200 dark:border-white/20 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-400 text-base"
                    placeholder="••••••••"
                    required
                  />
                </div>
                {passwordError && (
                  <p className="text-red-600 dark:text-red-400 text-sm">{passwordError}</p>
                )}
                {passwordSuccess && (
                  <p className="text-green-600 dark:text-green-400 text-sm">Password updated.</p>
                )}
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full min-h-[48px] bg-neutral-200 dark:bg-white/20 text-neutral-900 dark:text-white py-3 rounded-xl font-semibold text-base border border-neutral-200 dark:border-white/20 hover:bg-neutral-300 dark:hover:bg-white/30 disabled:opacity-50"
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
