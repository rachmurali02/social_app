'use client'

import { useEffect, useState, useCallback } from 'react'
import { Bell, X, BellOff } from 'lucide-react'
import Link from 'next/link'

const STORAGE_DISMISSED = 'loom_notif_dismissed'
const STORAGE_SILENCED = 'loom_notif_silenced_until'
const SILENCE_HOURS = 24

type Notification = {
  id: string
  type: string
  title: string
  message: string
  href: string
  createdAt: string
}

function getDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const s = localStorage.getItem(STORAGE_DISMISSED)
    return new Set(s ? JSON.parse(s) : [])
  } catch {
    return new Set()
  }
}

function setDismissed(ids: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_DISMISSED, JSON.stringify([...ids]))
  } catch {}
}

function getSilencedUntil(): number {
  if (typeof window === 'undefined') return 0
  try {
    return parseInt(localStorage.getItem(STORAGE_SILENCED) || '0', 10)
  } catch {
    return 0
  }
}

function setSilencedUntil(ts: number) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_SILENCED, String(ts))
  } catch {}
}

export default function NotificationBar() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [dismissed, setDismissedState] = useState<Set<string>>(new Set())
  const [silencedUntil, setSilencedUntilState] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadFromStorage = useCallback(() => {
    setDismissedState(getDismissed())
    setSilencedUntilState(getSilencedUntil())
  }, [])

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const isSilenced = silencedUntil > Date.now()
  const visible = notifications.filter((n) => !dismissed.has(n.id) && !isSilenced)
  const count = visible.length

  const handleDismiss = (id: string) => {
    const next = new Set(dismissed)
    next.add(id)
    setDismissedState(next)
    setDismissed(next)
  }

  const handleSilenceAll = () => {
    const until = Date.now() + SILENCE_HOURS * 60 * 60 * 1000
    setSilencedUntilState(until)
    setSilencedUntil(until)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors touch-manipulation"
        aria-label="Notifications"
      >
        <Bell size={22} strokeWidth={2} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] max-h-[min(70vh,400px)] overflow-y-auto glass-panel rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 z-50">
            <div className="p-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
              <span className="font-semibold text-neutral-900 dark:text-white">Notifications</span>
              {count > 0 && (
                <button
                  onClick={handleSilenceAll}
                  className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors"
                >
                  <BellOff size={14} /> Silence 24h
                </button>
              )}
            </div>
            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {loading ? (
                <div className="p-6 text-center text-neutral-500 dark:text-neutral-400 text-sm">Loading...</div>
              ) : visible.length === 0 ? (
                <div className="p-6 text-center text-neutral-500 dark:text-neutral-400 text-sm">
                  {isSilenced
                    ? 'Notifications silenced'
                    : 'No new notifications'}
                </div>
              ) : (
                visible.map((n) => (
                  <div
                    key={n.id}
                    className="group flex items-start gap-2 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  >
                    <Link
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className="flex-1 min-w-0"
                    >
                      <p className="font-medium text-neutral-900 dark:text-white text-sm">{n.title}</p>
                      <p className="text-neutral-500 dark:text-neutral-400 text-xs truncate">{n.message}</p>
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        handleDismiss(n.id)
                      }}
                      className="shrink-0 p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation"
                      aria-label="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
