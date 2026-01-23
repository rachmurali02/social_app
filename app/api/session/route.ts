import { NextRequest, NextResponse } from 'next/server'

interface Session {
  sessionId: string
  preferences: {
    location: string
    radius: number
    time: string
    activity: string
  } | null
  options: any[]
  userASelection: any | null
  userBConfirmed: boolean
  createdAt: number
}

const sessions = new Map<string, Session>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, sessionId, preferences, options, userASelection, userBConfirmed } = body

    if (action === 'create') {
      const newSessionId = Math.random().toString(36).substring(2, 15)
      const session: Session = {
        sessionId: newSessionId,
        preferences: preferences || null,
        options: options || [],
        userASelection: null,
        userBConfirmed: false,
        createdAt: Date.now(),
      }
      sessions.set(newSessionId, session)
      return NextResponse.json({ sessionId: newSessionId, session })
    }

    if (action === 'update') {
      if (!sessionId) {
        return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
      }

      let session = sessions.get(sessionId)

      if (!session) {
        // If session doesn't exist (e.g. new lambda instance), create it on the fly
        session = {
          sessionId,
          preferences: preferences || null,
          options: options || [],
          userASelection: userASelection || null,
          userBConfirmed: userBConfirmed ?? false,
          createdAt: Date.now(),
        }
      } else {
        if (preferences !== undefined) session.preferences = preferences
        if (options !== undefined) session.options = options
        if (userASelection !== undefined) session.userASelection = userASelection
        if (userBConfirmed !== undefined) session.userBConfirmed = userBConfirmed
      }

      sessions.set(sessionId, session)
      return NextResponse.json({ session })
    }

    if (action === 'get') {
      if (!sessionId) {
        return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
      }

      const session = sessions.get(sessionId)
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      return NextResponse.json({ session })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Session API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
  }

  const session = sessions.get(sessionId)
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json({ session })
}
