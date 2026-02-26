import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const meetups = await prisma.meetupSession.findMany({
      where: {
        OR: [
          { creatorId: session.user.id },
          { participants: { some: { userId: session.user.id } } },
        ],
      },
      select: { selectedOption: true },
    })

    const placeNames = new Set<string>()
    for (const m of meetups) {
      const opts = m.selectedOption as { name?: string } | null
      if (opts?.name && typeof opts.name === 'string') {
        placeNames.add(opts.name.trim())
      }
    }

    return NextResponse.json({ placeNames: [...placeNames] })
  } catch (error) {
    console.error('Visited places error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
