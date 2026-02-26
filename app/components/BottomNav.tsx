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
    <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-2xl bg-white/[0.06] border-t border-white/[0.1] pb-safe safe-area-inset-bottom shadow-[0_-4px_24px_rgba(0,0,0,0.2)]">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (pathname !== href && (pathname?.startsWith(href + '/') ?? false))
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] rounded-lg transition-colors ${
                isActive ? 'text-white' : 'text-white/60 hover:text-white/90'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
