'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Loader2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      setMessage(data.message || (data.error ? data.error : 'Check your email for a reset link.'))
    } catch {
      setMessage('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
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
          <h1 className="text-2xl font-black text-white mb-2">Forgot password?</h1>
          <p className="text-white/80 mb-6">Enter your email and we&apos;ll send a reset link.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white font-semibold mb-2">
                <Mail className="inline mr-2" size={18} /> Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full min-h-[48px] px-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="you@example.com"
              />
            </div>
            {message && (
              <p className="text-white/90 text-sm">{message}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={22} className="animate-spin" /> : 'Send reset link'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
