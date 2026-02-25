import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    await prisma.$connect()
    const count = await prisma.user.count()
    return NextResponse.json({ ok: true, users: count })
  } catch (e) {
    console.error('db-test error:', e)
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 500 }
    )
  }
}
