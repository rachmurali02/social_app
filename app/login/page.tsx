'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Users, Mail, Lock, UserPlus, Mic, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const name = formData.get('name') as string | null

    try {
      if (!isLogin) {
        const registerResponse = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        })

        if (!registerResponse.ok) {
          const data = await registerResponse.json()
          throw new Error(data.error || 'Registration failed')
        }
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        await new Promise((resolve) => setTimeout(resolve, 100))
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-black via-neutral-950 to-black px-4 py-6 sm:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[url('/images/party-login-hero.jpg')] bg-cover bg-center opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/85 to-black/96" />
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-amber-500/30 to-rose-400/15 blur-3xl" />
        <div className="absolute -bottom-40 right-0 h-80 w-80 rounded-full bg-gradient-to-br from-emerald-500/25 to-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-md mx-auto flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-black/30">
              M
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-white/60">MeetUp AI</p>
              <p className="text-sm text-white/80">Smart social coordination</p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-medium tracking-wide text-white/80">
            <Sparkles size={14} /> Plan your next meetup
          </span>
        </header>

        <main className="bg-white/8 backdrop-blur-2xl rounded-3xl px-5 py-6 sm:px-7 sm:py-7 border border-white/15 shadow-[0_18px_60px_rgba(0,0,0,0.8)] transition-transform duration-300 hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-semibold tracking-[0.3em] text-white/60 uppercase">
                Step 1 of 3
              </p>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                Tell me who&apos;s coming
              </h1>
              <p className="text-sm text-white/80">
                Sign in so we can save your crew and favorite spots.
              </p>
            </div>
            <div className="hidden sm:flex items-center justify-center">
              <div className="relative h-16 w-16 rounded-3xl bg-gradient-to-br from-yellow-400 to-pink-500 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.6)]">
                <div className="h-10 w-10 rounded-2xl bg-black/20 flex items-center justify-center text-white">
                  <Mic size={22} />
                </div>
                <div className="absolute inset-0 rounded-3xl border border-white/40 border-dashed animate-pulse" />
              </div>
            </div>
          </div>

          <div className="mb-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-amber-400 via-pink-500 to-purple-500" />
          </div>

          <div className="inline-flex mb-6 rounded-full bg-white/10 p-1 border border-white/15">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                isLogin
                  ? 'bg-white text-purple-900 shadow-[0_10px_30px_rgba(15,23,42,0.6)]'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                !isLogin
                  ? 'bg-white text-purple-900 shadow-[0_10px_30px_rgba(15,23,42,0.6)]'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="flex items-center gap-2 text-white font-semibold mb-2 text-sm">
                  <Users size={18} />
                  Name (optional)
                </label>
                <input
                  name="name"
                  type="text"
                  className="w-full h-12 rounded-2xl bg-black/40 border border-white/25 px-4 text-sm text-white caret-white placeholder-white/60 outline-none focus:ring-2 focus:ring-amber-400/80 focus:border-transparent transition-colors"
                  placeholder="What should friends call you?"
                />
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-white font-semibold mb-2 text-sm">
                <Mail size={18} />
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                className="w-full h-12 rounded-2xl bg-black/40 border border-white/25 px-4 text-sm text-white caret-white placeholder-white/60 outline-none focus:ring-2 focus:ring-amber-400/80 focus:border-transparent transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-white font-semibold mb-2 text-sm">
                <Lock size={18} />
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full h-12 rounded-2xl bg-black/40 border border-white/25 px-4 text-sm text-white caret-white placeholder-white/60 outline-none focus:ring-2 focus:ring-amber-400/80 focus:border-transparent transition-colors"
                placeholder={isLogin ? 'Your password' : 'At least 6 characters'}
              />
            </div>

            {error && (
              <div className="space-y-2">
                <div className="bg-red-500/20 border border-red-400/50 rounded-2xl px-4 py-3 text-red-100 text-sm">
                  {error}
                </div>
                {isLogin && (
                  <Link
                    href="/forgot-password"
                    className="block text-center text-blue-200 hover:text-blue-100 text-xs font-medium min-h-[40px] flex items-center justify-center"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full h-13 sm:h-14 rounded-full bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 text-white font-semibold text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 shadow-[0_16px_40px_rgba(0,0,0,0.7)] hover:shadow-[0_20px_55px_rgba(0,0,0,0.85)] hover:-translate-y-0.5 active:translate-y-0 transition-transform transition-shadow disabled:opacity-60 disabled:hover:shadow-[0_16px_40px_rgba(0,0,0,0.7)]"
            >
              {loading ? (
                'Setting things up...'
              ) : isLogin ? (
                <>
                  <Lock size={18} />
                  Enter the party
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Create my account
                </>
              )}
            </button>
          </form>

          <p className="mt-4 text-[11px] text-center text-white/60">
            By continuing you agree to hang out respectfully. No spam, just good meetups.
          </p>
        </main>
      </div>
    </div>
  )
}
