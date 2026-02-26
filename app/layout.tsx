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
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-white antialiased font-sans selection:bg-orange-200 dark:selection:bg-orange-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
