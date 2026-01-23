import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/auth'
import { prisma } from '../../../lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')
    const query = searchParams.get('q')

    if (action === 'search' && query) {
      const users = await prisma.user.findMany({
        where: {
          AND: [
            {
              OR: [
                { email: { contains: query, mode: 'insensitive' } },
                { name: { contains: query, mode: 'insensitive' } },
              ],
            },
            { id: { not: session.user.id } },
          ],
        },
        include: { profile: true },
        take: 10,
      })

      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [
            { senderId: session.user.id },
            { receiverId: session.user.id },
          ],
        },
      })

      const usersWithStatus = users.map((user) => {
        const friendship = friendships.find(
          (f) => f.senderId === user.id || f.receiverId === user.id
        )
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          profile: user.profile,
          friendshipStatus: friendship?.status || null,
          isSender: friendship?.senderId === session.user.id || false,
        }
      })

      return NextResponse.json({ users: usersWithStatus })
    }

    if (action === 'list') {
      const friendships = await prisma.friendship.findMany({
        where: {
          AND: [
            {
              OR: [{ senderId: session.user.id }, { receiverId: session.user.id }],
            },
            { status: 'accepted' },
          ],
        },
        include: {
          sender: { include: { profile: true } },
          receiver: { include: { profile: true } },
        },
      })

      const friends = friendships.map((f) =>
        f.senderId === session.user.id ? f.receiver : f.sender
      )

      return NextResponse.json({ friends })
    }

    if (action === 'requests') {
      const requests = await prisma.friendship.findMany({
        where: {
          receiverId: session.user.id,
          status: 'pending',
        },
        include: {
          sender: { include: { profile: true } },
        },
      })

      return NextResponse.json({ requests })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Friends API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, userId } = body

    if (action === 'request') {
      const existing = await prisma.friendship.findFirst({
        where: {
          OR: [
            { senderId: session.user.id, receiverId: userId },
            { senderId: userId, receiverId: session.user.id },
          ],
        },
      })

      if (existing) {
        return NextResponse.json({ error: 'Friendship already exists' }, { status: 400 })
      }

      const friendship = await prisma.friendship.create({
        data: {
          senderId: session.user.id,
          receiverId: userId,
          status: 'pending',
        },
      })

      return NextResponse.json({ friendship })
    }

    if (action === 'accept') {
      const friendship = await prisma.friendship.updateMany({
        where: {
          senderId: userId,
          receiverId: session.user.id,
          status: 'pending',
        },
        data: { status: 'accepted' },
      })

      return NextResponse.json({ success: true })
    }

    if (action === 'decline' || action === 'block') {
      await prisma.friendship.deleteMany({
        where: {
          OR: [
            { senderId: session.user.id, receiverId: userId },
            { senderId: userId, receiverId: session.user.id },
          ],
        },
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Friends API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
