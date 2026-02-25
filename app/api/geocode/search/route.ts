import { NextRequest, NextResponse } from 'next/server'
import { geocodeSuggestions } from '../../../../lib/places'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '5', 10), 10)
    const suggestions = await geocodeSuggestions(q, limit)
    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Geocode search error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
