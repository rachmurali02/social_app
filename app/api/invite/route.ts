import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '../../../lib/auth'
import { sendAppInviteEmail } from '../../../lib/email'

export const dynamic = 'force-dynamic'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  personalNote: z.string().max(300).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const { email, personalNote } = parsed.data
    const inviterName = session.user.name || session.user.email || 'Someone'
    const appUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')

    const sent = await sendAppInviteEmail({ to: email, inviterName, appUrl, personalNote })

    if (!sent) {
      return NextResponse.json(
        { error: 'Email could not be sent. Make sure SMTP is configured in .env.local.' },
        { status: 503 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Invite API error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
