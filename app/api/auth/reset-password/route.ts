import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../../../../lib/db'

const schema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6, 'At least 6 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }
    const { token, newPassword } = parsed.data

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    })
    if (!record || record.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Link expired or invalid' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: hashed },
      }),
      prisma.passwordResetToken.delete({ where: { id: record.id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
