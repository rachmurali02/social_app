import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function handler(req: Request, context: { params: { nextauth: string[] } }) {
  try {
    const { authOptions } = await import('../../../../lib/auth')
    return await NextAuth(authOptions)(req, context)
  } catch (e) {
    console.error('NextAuth error:', e)
    return NextResponse.json(
      { error: 'Auth failed', details: String(e) },
      { status: 500 }
    )
  }
}

export { handler as GET, handler as POST }
