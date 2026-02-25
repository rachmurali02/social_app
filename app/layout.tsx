import type { Metadata } from 'next'
import Providers from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'MeetUp AI - Smart Social Coordination',
  description: 'Plan meetups with AI-powered recommendations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-white antialiased font-sans selection:bg-white/20">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
