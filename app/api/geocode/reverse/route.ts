import { NextRequest, NextResponse } from 'next/server'
import { reverseGeocode } from '../../../../lib/places'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat') || '')
    const lon = parseFloat(searchParams.get('lon') || '')
    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json({ error: 'lat and lon required' }, { status: 400 })
    }
    const displayName = await reverseGeocode(lat, lon)
    return NextResponse.json({ displayName })
  } catch (error) {
    console.error('Reverse geocode API error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
