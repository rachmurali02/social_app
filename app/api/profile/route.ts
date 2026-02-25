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
    return NextResponse.json({ profile: profile || { location: null } })
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
    const { name, location } = body

    if (typeof name === 'string') {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { name },
      })
    }
    if (typeof location === 'string') {
      await prisma.profile.upsert({
        where: { userId: session.user.id },
        create: { userId: session.user.id, location: location.trim() || null },
        update: { location: location.trim() || null },
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true },
    })
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
