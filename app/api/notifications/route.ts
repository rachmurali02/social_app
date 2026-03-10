import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { prisma } from '../../../lib/db'

export const dynamic = 'force-dynamic'

const PENDING_INVITE_STALE_HOURS = 24
const FRIENDSHIP_RECENT_DAYS = 7
const RESCHEDULED_RECENT_DAYS = 7

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notifications: Array<{
      id: string
      type: 'friend_request' | 'friendship_accepted' | 'pending_invite' | 'meetup_rescheduled'
      title: string
      message: string
      href: string
      createdAt: string
      meta?: Record<string, unknown>
    }> = []

    const now = new Date()
    const staleInviteCutoff = new Date(now.getTime() - PENDING_INVITE_STALE_HOURS * 60 * 60 * 1000)
    const recentFriendshipCutoff = new Date(now.getTime() - FRIENDSHIP_RECENT_DAYS * 24 * 60 * 60 * 1000)
    const rescheduledCutoff = new Date(now.getTime() - RESCHEDULED_RECENT_DAYS * 24 * 60 * 60 * 1000)

    const [friendRequests, recentFriendships, staleInvites, meetupsAsParticipant] = await Promise.all([
      prisma.friendship.findMany({
        where: { receiverId: session.user.id, status: 'pending' },
        include: { sender: { select: { id: true, name: true, email: true } } },
      }),
      prisma.friendship.findMany({
        where: {
          OR: [{ senderId: session.user.id }, { receiverId: session.user.id }],
          status: 'accepted',
          updatedAt: { gte: recentFriendshipCutoff },
        },
        include: {
          sender: { select: { id: true, name: true, email: true } },
          receiver: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.meetupParticipant.findMany({
        where: {
          userId: session.user.id,
          status: 'pending',
          createdAt: { lt: staleInviteCutoff },
        },
        include: {
          meetup: {
            include: {
              creator: { select: { name: true, email: true } },
            },
          },
        },
      }),
      prisma.meetupSession.findMany({
        where: {
          status: { not: 'cancelled' },
          participants: { some: { userId: session.user.id } },
          creatorId: { not: session.user.id },
        },
        include: {
          creator: { select: { name: true, email: true } },
        },
      }),
    ])

    for (const fr of friendRequests) {
      const name = fr.sender.name || 'Someone'
      notifications.push({
        id: `fr-${fr.id}`,
        type: 'friend_request',
        title: 'Friend request',
        message: `${name} wants to be friends`,
        href: '/friends',
        createdAt: fr.createdAt.toISOString(),
        meta: { senderId: fr.senderId },
      })
    }

    for (const f of recentFriendships) {
      const other = f.senderId === session.user.id ? f.receiver : f.sender
      const name = other.name || 'Someone'
      notifications.push({
        id: `accepted-${f.id}`,
        type: 'friendship_accepted',
        title: 'You are now friends',
        message: `You and ${name} are now friends`,
        href: '/friends',
        createdAt: f.updatedAt.toISOString(),
        meta: { friendId: other.id },
      })
    }

    for (const p of staleInvites) {
      const prefs = (p.meetup.preferences || {}) as { activity?: string; date?: string; time?: string }
      const creatorName = p.meetup.creator?.name || 'Someone'
      const activity = prefs.activity || 'meetup'
      notifications.push({
        id: `invite-${p.id}`,
        type: 'pending_invite',
        title: 'Invite waiting for response',
        message: `${creatorName} invited you to ${activity} — respond soon`,
        href: '/invitations',
        createdAt: p.createdAt.toISOString(),
        meta: { meetupId: p.meetupId },
      })
    }

    for (const meetup of meetupsAsParticipant) {
      const prefs = (meetup.preferences || {}) as { lastRescheduledAt?: string; activity?: string; date?: string; time?: string }
      const rescheduledAt = prefs.lastRescheduledAt ? new Date(prefs.lastRescheduledAt) : null
      if (!rescheduledAt || rescheduledAt < rescheduledCutoff) continue
      const placeName = (meetup.selectedOption as { name?: string } | null)?.name
      const creatorName = meetup.creator?.name || 'Someone'
      const label = placeName || prefs.activity || 'Meetup'
      notifications.push({
        id: `reschedule-${meetup.id}`,
        type: 'meetup_rescheduled',
        title: 'Meetup rescheduled',
        message: `${creatorName} rescheduled ${label}`,
        href: `/meetups/${meetup.id}`,
        createdAt: prefs.lastRescheduledAt || meetup.updatedAt.toISOString(),
        meta: { meetupId: meetup.id },
      })
    }

    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error('Notifications API error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
