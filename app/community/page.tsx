'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CommunityPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/discover')
  }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950">
      <p className="text-white/80">Redirecting...</p>
    </div>
  )
}
