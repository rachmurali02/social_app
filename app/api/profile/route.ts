import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/auth'
import { prisma } from '../../../lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    })
    return NextResponse.json({ profile: profile || { location: null, avatar: null } })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, location, avatar } = body

    if (typeof name === 'string') {
      const trimmed = name.trim()
      if (!trimmed) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
      await prisma.user.update({
        where: { id: session.user.id },
        data: { name: trimmed },
      })
    }
    if (typeof location === 'string' || typeof avatar === 'string') {
      await prisma.profile.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          location: typeof location === 'string' ? location.trim() || null : null,
          avatar: typeof avatar === 'string' ? avatar.trim() || null : null,
        },
        update: {
          ...(typeof location === 'string' && { location: location.trim() || null }),
          ...(typeof avatar === 'string' && { avatar: avatar.trim() || null }),
        },
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { profile: true },
    })
    return NextResponse.json({
      user: {
        id: user!.id,
        email: user!.email,
        name: user!.name,
        profile: user!.profile,
      },
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
