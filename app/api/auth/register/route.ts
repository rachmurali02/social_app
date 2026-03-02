import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../../../../lib/db'
import { sendWelcomeEmail } from '../../../../lib/email'

// Disposable / obviously fake email domains
const BLOCKED_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
  'guerrillamail.de', 'guerrillamail.biz', 'guerrillamail.info',
  'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'throwam.com',
  'sharklasers.com', 'guerrillamailblock.com', 'grr.la', 'guerrillamail.biz',
  'spam4.me', 'yopmail.com', 'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf',
  'nospam.ze.tc', 'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr',
  'courriel.fr.nf', 'moncourrier.fr.nf', 'monemail.fr.nf', 'monmail.fr.nf',
  'trashmail.at', 'trashmail.com', 'trashmail.io', 'trashmail.me',
  'trashmail.net', 'trashmail.org', 'trashmail.xyz',
  'dispostable.com', 'mailnull.com', 'spamgourmet.com', 'spamgourmet.net',
  'spamgourmet.org', 'maildrop.cc', 'throwam.com', 'fakeinbox.com',
  'mailnesia.com', 'mailnull.com', 'spamfree24.org', 'spamfree24.de',
  'spamfree24.eu', 'spamfree24.info', 'spamfree24.net',
  'spamfree.eu', 'spamhere.eu', 'spamspot.com', 'spamthisplease.com',
  'spamtrail.com', 'spamtrap.ro', 'spamwc.de', 'spamwc.net',
  'spamwc.org', 'spamhole.com', 'spamex.com', 'spam.la',
  'disposableaddress.com', 'discard.email', 'discardmail.com', 'discardmail.de',
  'throwaway.email', 'throam.com', 'spamovf.com', 'mailseal.de',
  'mailzilla.com', 'mailzilla.org', 'mailzilla.orgmbx.cc',
  'fakemailz.com', 'meltmail.com', 'filzmail.com', 'email60.com',
  'tempe-mail.com', 'temporaryemail.net', 'temporaryforwarding.com',
  'temporaryinbox.com', 'tempr.email', 'tempsky.com',
  'owlpic.com', 'spamgob.com', 'notmailinator.com', 'binkmail.com',
  'bobmail.info', 'chammy.info', 'devnullmail.com', 'discard.email',
  'suremail.info', 'trbvm.com', 'trashdevil.com', 'trashdevil.de',
  'mailmetrash.com', 'mailjunk.eu', 'getonemail.net', 'getonemail.com',
  'hi.com',
])

function isBlockedDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return true
  if (BLOCKED_DOMAINS.has(domain)) return true
  // Block single-word domains with no TLD substance (e.g. hi.com, yo.com, a.com)
  const [label] = domain.split('.')
  if (label && label.length <= 3 && BLOCKED_DOMAINS.has(domain)) return true
  return false
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1, 'Name is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email: rawEmail, password, name } = registerSchema.parse(body)
    const email = rawEmail.toLowerCase().trim()

    if (isBlockedDomain(email)) {
      return NextResponse.json(
        { error: 'Please use a real email address. Disposable or temporary email domains are not allowed.' },
        { status: 400 }
      )
    }

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
