'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Share2, Copy, Check, ArrowLeft } from 'lucide-react'

export default function InvitePage() {
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')

  useEffect(() => {
    setInviteUrl(window.location.origin + '/invite')
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share)
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Loom',
          text: 'Plan meetups with AI-powered place recommendations. Join Loom!',
          url: inviteUrl,
        })
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        handleCopy()
      }
    } else {
      handleCopy()
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-100 dark:bg-neutral-950 p-6">
      <div className="max-w-md mx-auto flex-1 flex flex-col justify-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white mb-8 min-h-[44px]"
        >
          <ArrowLeft size={20} /> Back
        </Link>

        <div className="glass-panel rounded-3xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center">
            <Share2 className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            Invite friends to Loom
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8">
            Want to send this link to someone and ask them to join the app? Share the invite link below.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleShare}
              className="w-full min-h-[48px] btn-primary flex items-center justify-center gap-2"
            >
              <Share2 size={20} />
              {canShare ? 'Share link' : 'Copy link'}
            </button>
            <button
              onClick={handleCopy}
              className="w-full min-h-[48px] glass-panel rounded-xl flex items-center justify-center gap-2 text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors"
            >
              {copied ? (
                <>
                  <Check size={20} className="text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={20} />
                  Copy link
                </>
              )}
            </button>
          </div>

          <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
            They can use the link to create a free account and start planning meetups with you.
          </p>
        </div>
      </div>
    </div>
  )
}
