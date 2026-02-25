import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '../../../../lib/db'
import { sendPasswordResetEmail } from '../../../../lib/email'

const schema = z.object({ email: z.string().email() })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    const { email } = parsed.data

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })
    if (!user) {
      return NextResponse.json({ message: 'If that email exists, we sent a reset link.' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    })

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${token}`
    await sendPasswordResetEmail(user.email, resetUrl, user.name || undefined)

    return NextResponse.json({ message: 'If that email exists, we sent a reset link.' })
  } catch (error) {
    console.error('Request reset error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
