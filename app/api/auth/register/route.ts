import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../../../../lib/db'
import { sendWelcomeEmail } from '../../../../lib/email'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1, 'Name is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name } = registerSchema.parse(body)

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        profile: {
          create: {},
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    sendWelcomeEmail(user.email, user.name || '').catch(() => {})

    return NextResponse.json({ user }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    const isPrismaInit = error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'PrismaClientInitializationError'
    const isDbFatal = isPrismaInit || (error && typeof error === 'object' && 'message' in error && typeof (error as { message: string }).message === 'string' && (error as { message: string }).message.includes('FATAL'))
    if (isDbFatal) {
      console.error('Registration error (database):', error)
      return NextResponse.json(
        { error: 'Database unavailable. Check DATABASE_URL in .env.local and that your database (e.g. Neon/Supabase) is active.' },
        { status: 503 }
      )
    }
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
