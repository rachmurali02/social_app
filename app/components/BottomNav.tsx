'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Users, Search, CalendarDays } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/meetups', label: 'Meetups', icon: CalendarDays },
  { href: '/meetup', label: 'Create', icon: Calendar },
  { href: '/friends', label: 'Friends', icon: Users },
  { href: '/discover', label: 'Discover', icon: Search },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <>
      {/* ── Desktop: fixed left sidebar ── */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-56 z-50 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-r border-neutral-200/60 dark:border-neutral-800/60 py-8 px-4">
        <span className="text-xl font-bold text-orange-500 tracking-tight mb-10 px-2">Loom</span>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (pathname !== href && (pathname?.startsWith(href + '/') ?? false))
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/[0.06] hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* ── Mobile: fixed bottom bar ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-t border-neutral-200/60 dark:border-neutral-800/60 pb-safe safe-area-inset-bottom">
        <div className="max-w-lg mx-auto flex items-center justify-around h-14">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (pathname !== href && (pathname?.startsWith(href + '/') ?? false))
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] rounded-lg transition-colors ${
                  isActive ? 'text-orange-600' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
