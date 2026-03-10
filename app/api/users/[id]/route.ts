import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/db'

function isFriend(sessionId: string, friendships: { senderId: string; receiverId: string }[], targetId: string) {
  return friendships.some(
    (f) => (f.senderId === sessionId && f.receiverId === targetId) || (f.receiverId === sessionId && f.senderId === targetId)
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = params?.id
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Use /profile for your own profile' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ senderId: session.user.id }, { receiverId: session.user.id }],
        status: 'accepted',
      },
    })

    const isFriendOf = isFriend(session.user.id, friendships, userId)

    if (!isFriendOf) {
      return NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          email: null,
          profile: user.profile ? { avatar: user.profile.avatar, location: user.profile.location } : null,
        },
        pastMeetups: [],
        upcomingMeetups: [],
        isFriend: false,
      })
    }

    const meetups = await prisma.meetupSession.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { participants: { some: { userId } } },
        ],
      },
      include: {
        creator: { select: { id: true, email: true, name: true } },
        participants: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const pastMeetups = meetups.filter((m) => m.status === 'confirmed')
    const upcomingMeetups = meetups.filter((m) => m.status === 'pending')

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        profile: user.profile,
      },
      pastMeetups,
      upcomingMeetups,
      isFriend: true,
    })
  } catch (error) {
    console.error('User profile fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
