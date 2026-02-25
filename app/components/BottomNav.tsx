'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Users, Heart } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/meetup', label: 'Meetup', icon: Calendar },
  { href: '/friends', label: 'Friends', icon: Users },
  { href: '/community', label: 'Community', icon: Heart },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-xl border-t border-white/20 pb-safe safe-area-inset-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && (pathname?.startsWith(href) ?? false))
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
