'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Lock, Loader2 } from 'lucide-react'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get('token') || ''
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) setError('Missing reset link.')
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to reset')
        return
      }
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 text-center max-w-md">
          <p className="text-red-200 mb-4">Invalid or missing reset link.</p>
          <Link href="/forgot-password" className="text-blue-300 underline">Request a new link</Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 text-center max-w-md">
          <p className="text-green-200 font-semibold">Password updated. Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 p-4">
      <div className="max-w-md w-full">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 min-h-[44px]"
        >
          <ArrowLeft size={20} /> Back to login
        </Link>
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/20">
          <h1 className="text-2xl font-black text-white mb-2">Set new password</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white font-semibold mb-2">
                <Lock className="inline mr-2" size={18} /> New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full min-h-[48px] px-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label className="block text-white font-semibold mb-2">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full min-h-[48px] px-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-red-200 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={22} className="animate-spin" /> : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
