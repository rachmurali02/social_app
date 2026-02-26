'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Users, Mail, Lock, UserPlus, Mic, Sparkles } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'

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
        if (!name?.trim()) {
          throw new Error('Name is required')
        }
        const registerResponse = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name: name?.trim() }),
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
    <div className="min-h-screen relative overflow-hidden bg-neutral-100 dark:bg-neutral-950 px-4 py-6 sm:px-6">
      <div className="relative z-10 max-w-md mx-auto flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
              M
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-neutral-500 dark:text-neutral-400">MeetUp AI</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Smart social coordination</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1 text-[11px] font-medium tracking-wide text-neutral-600 dark:text-neutral-400">
              <Sparkles size={14} /> Plan your next meetup
            </span>
          </div>
        </header>

        <main className="glass-panel rounded-3xl px-5 py-6 sm:px-7 sm:py-7 shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-semibold tracking-[0.3em] text-neutral-500 dark:text-neutral-400 uppercase">
                Step 1 of 3
              </p>
              <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white leading-tight">
                Tell me who&apos;s coming
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Sign in so we can save your crew and favorite spots.
              </p>
            </div>
            <div className="hidden sm:flex items-center justify-center">
              <div className="relative h-16 w-16 rounded-3xl bg-gradient-to-br from-orange-400 to-purple-500 flex items-center justify-center shadow-lg">
                <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                  <Mic size={22} />
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4 h-1.5 rounded-full bg-neutral-200 overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500" />
          </div>

          <div className="inline-flex mb-6 rounded-full bg-neutral-200 p-1 border border-neutral-200">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                isLogin ? 'bg-white text-neutral-900 shadow-md' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                !isLogin ? 'bg-white text-neutral-900 shadow-md' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="flex items-center gap-2 text-neutral-900 dark:text-white font-semibold mb-2 text-sm">
                  <Users size={18} />
                  Name
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  className="w-full h-12 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-colors"
                  placeholder="What should friends call you?"
                />
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-neutral-900 dark:text-white font-semibold mb-2 text-sm">
                <Mail size={18} />
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                className="w-full h-12 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-neutral-900 dark:text-white font-semibold mb-2 text-sm">
                <Lock size={18} />
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full h-12 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-colors"
                placeholder={isLogin ? 'Your password' : 'At least 6 characters'}
              />
            </div>

            {error && (
              <div className="space-y-2">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 text-red-700 dark:text-red-300 text-sm">
                  {error}
                </div>
                {isLogin && (
                  <Link
                    href="/forgot-password"
                    className="block text-center text-orange-600 hover:text-orange-700 text-xs font-medium min-h-[40px] flex items-center justify-center"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full h-13 sm:h-14 rounded-full btn-primary text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 disabled:opacity-60"
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

          <p className="mt-4 text-[11px] text-center text-neutral-500 dark:text-neutral-400">
            By continuing you agree to hang out respectfully. No spam, just good meetups.
          </p>
        </main>
      </div>
    </div>
  )
}
