import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { prisma } from '../../../lib/db'
import {
  sendMeetupInviteEmail,
  sendMeetupConfirmedToInvitee,
  sendMeetupAcceptedToCreator,
  sendMeetupCancelledEmail,
  sendMeetupRescheduledEmail,
} from '../../../lib/email'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, meetupId, participantId, status: participantStatus } = body

    if (action === 'create') {
      const { preferences, selectedOption, friendIds, options } = body

      const meetup = await prisma.meetupSession.create({
        data: {
          creatorId: session.user.id,
          preferences: preferences,
          options: options || [],
          selectedOption: selectedOption,
          status: 'pending',
          participants: {
            create: Array.isArray(friendIds)
              ? friendIds.map((friendId: string) => ({
                  userId: friendId,
                  status: 'pending',
                }))
              : [],
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
          creator: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      })

      if (Array.isArray(meetup.participants) && meetup.participants.length > 0) {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const creatorName = meetup.creator.name || meetup.creator.email
        const placeName =
          (selectedOption && selectedOption.name) ||
          (meetup.selectedOption as any)?.name ||
          undefined
        const address =
          (selectedOption && selectedOption.address) ||
          (meetup.selectedOption as any)?.address ||
          undefined
        const time =
          (preferences && preferences.time) ||
          (meetup.preferences as any)?.time ||
          undefined
        const activity =
          (preferences && preferences.activity) ||
          (meetup.preferences as any)?.activity ||
          undefined

        await Promise.all(
          meetup.participants.map((participant) => {
            const email = participant.user?.email
            if (!email) return Promise.resolve(false)
            return sendMeetupInviteEmail({
              to: email,
              inviteeName: participant.user?.name || email,
              inviterName: creatorName,
              placeName,
              address,
              time,
              activity,
              appUrl: baseUrl,
            }).catch((e) => {
              console.error('Meetup invite email error:', e)
              return false
            })
          })
        )
      }

      return NextResponse.json({ meetup })
    }

    if (action === 'confirm' || action === 'decline') {
      if (!participantId) {
        return NextResponse.json({ error: 'Participant ID required' }, { status: 400 })
      }

      const participant = await prisma.meetupParticipant.findUnique({
        where: { id: participantId },
        include: {
          user: { select: { id: true, email: true, name: true } },
          meetup: {
            include: {
              creator: { select: { id: true, email: true, name: true } },
            },
          },
        },
      })

      if (!participant) {
        return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
      }

      if (participant.userId !== session.user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      const newStatus = action === 'confirm' ? 'confirmed' : 'declined'
      const updatedParticipant = await prisma.meetupParticipant.update({
        where: { id: participantId },
        data: {
          status: newStatus,
          confirmedAt: action === 'confirm' ? new Date() : null,
        },
        include: {
          meetup: {
            include: {
              creator: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      })

      if (action === 'confirm' && participant.user?.email && participant.meetup?.creator?.email) {
        const prefs = (participant.meetup as any).preferences
        const opts = (participant.meetup as any).selectedOption
        const placeName = opts?.name || 'your meetup'
        const address = opts?.address || ''
        const time = prefs?.time || ''
        const activity = prefs?.activity || 'meetup'
        const inviterName = participant.meetup.creator.name || participant.meetup.creator.email
        const accepterName = participant.user.name || participant.user.email
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

        sendMeetupConfirmedToInvitee({
          to: participant.user.email,
          inviteeName: participant.user.name || undefined,
          placeName,
          address,
          time,
          activity,
          inviterName,
          mapUrl: opts?.mapUrl,
          appUrl: baseUrl,
        }).catch((e) => console.error('Meetup confirmed to invitee:', e))

        sendMeetupAcceptedToCreator({
          to: participant.meetup.creator.email,
          creatorName: inviterName,
          accepterName,
          placeName,
          address,
          time,
          activity,
          appUrl: baseUrl,
        }).catch((e) => console.error('Meetup accepted to creator:', e))
      }

      const allParticipants = await prisma.meetupParticipant.findMany({
        where: { meetupId: participant.meetupId },
      })

      const allConfirmed = allParticipants.every((p) => p.status === 'confirmed' || p.status === 'declined')
      const hasAnyConfirmed = allParticipants.some((p) => p.status === 'confirmed')

      if (allConfirmed && hasAnyConfirmed) {
        await prisma.meetupSession.update({
          where: { id: participant.meetupId },
          data: { status: 'confirmed' },
        })
      }

      return NextResponse.json({ participant: updatedParticipant })
    }

    if (action === 'cancel') {
      const mid = body.meetupId
      if (!mid) return NextResponse.json({ error: 'meetupId required' }, { status: 400 })
      const m = await prisma.meetupSession.findFirst({
        where: { id: mid, creatorId: session.user.id },
        include: {
          creator: { select: { id: true, email: true, name: true } },
          participants: { include: { user: { select: { id: true, email: true, name: true } } } },
        },
      })
      if (!m) return NextResponse.json({ error: 'Meetup not found or not creator' }, { status: 404 })
      if (m.status === 'cancelled') return NextResponse.json({ meetup: m }, { status: 200 })
      const updated = await prisma.meetupSession.update({
        where: { id: mid },
        data: { status: 'cancelled' },
        include: {
          creator: { select: { id: true, email: true, name: true } },
          participants: { include: { user: { select: { id: true, email: true, name: true } } } },
        },
      })
      const opts = m.selectedOption as { name?: string } | null
      const prefs = m.preferences as { activity?: string } | null
      const placeName = opts?.name || 'your meetup'
      const activity = prefs?.activity || 'meetup'
      const creatorName = m.creator.name || m.creator.email
      for (const p of m.participants) {
        if (p.user?.email && p.userId !== session.user.id) {
          sendMeetupCancelledEmail({
            to: p.user.email,
            recipientName: p.user.name || undefined,
            creatorName,
            placeName,
            activity,
          }).catch((e) => console.error('Send cancelled email:', e))
        }
      }
      return NextResponse.json({ meetup: updated })
    }

    if (action === 'reschedule') {
      const mid = body.meetupId
      const newPrefs = body.preferences
      if (!mid) return NextResponse.json({ error: 'meetupId required' }, { status: 400 })
      if (!newPrefs || typeof newPrefs !== 'object') {
        return NextResponse.json({ error: 'preferences (time, date, etc.) required' }, { status: 400 })
      }
      const m = await prisma.meetupSession.findFirst({
        where: { id: mid, creatorId: session.user.id },
        include: {
          creator: { select: { id: true, email: true, name: true } },
          participants: { include: { user: { select: { id: true, email: true, name: true } } } },
        },
      })
      if (!m) return NextResponse.json({ error: 'Meetup not found or not creator' }, { status: 404 })
      if (m.status === 'cancelled') return NextResponse.json({ error: 'Cannot reschedule cancelled meetup' }, { status: 400 })
      const currentPrefs = (m.preferences || {}) as Record<string, unknown>
      const merged = { ...currentPrefs, ...newPrefs }
      const updated = await prisma.meetupSession.update({
        where: { id: mid },
        data: { preferences: merged },
        include: {
          creator: { select: { id: true, email: true, name: true } },
          participants: { include: { user: { select: { id: true, email: true, name: true } } } },
        },
      })
      const opts = m.selectedOption as { name?: string; address?: string } | null
      const placeName = opts?.name || 'your meetup'
      const address = opts?.address || ''
      const time = (merged.time as string) || ''
      const date = (merged.date as string) || ''
      const activity = (merged.activity as string) || 'meetup'
      const creatorName = m.creator.name || m.creator.email
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      for (const p of m.participants) {
        if (p.user?.email && p.userId !== session.user.id) {
          sendMeetupRescheduledEmail({
            to: p.user.email,
            recipientName: p.user.name || undefined,
            creatorName,
            placeName,
            address,
            time,
            date: date || undefined,
            activity,
            appUrl: baseUrl,
          }).catch((e) => console.error('Send rescheduled email:', e))
        }
      }
      return NextResponse.json({ meetup: updated })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Meetups API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const id = searchParams.get('id')

    if (id) {
      const meetup = await prisma.meetupSession.findFirst({
        where: {
          id,
          OR: [
            { creatorId: session.user.id },
            { participants: { some: { userId: session.user.id } } },
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
      })
      if (!meetup) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ meetup })
    }

    if (type === 'invitations') {
      const invitations = await prisma.meetupParticipant.findMany({
        where: {
          userId: session.user.id,
          status: 'pending',
        },
        include: {
          meetup: {
            include: {
              creator: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return NextResponse.json({ invitations })
    }

    if (type === 'created') {
      const meetups = await prisma.meetupSession.findMany({
        where: {
          creatorId: session.user.id,
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return NextResponse.json({ meetups })
    }

    const allMeetups = await prisma.meetupSession.findMany({
      where: {
        OR: [
          { creatorId: session.user.id },
          {
            participants: {
              some: {
                userId: session.user.id,
              },
            },
          },
        ],
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ meetups: allMeetups })
  } catch (error) {
    console.error('Meetups API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
