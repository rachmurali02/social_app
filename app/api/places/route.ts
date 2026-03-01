import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { geocode, fetchNearbyPlaces } from '../../../lib/places'
import { enhancePlacesWithLlama } from '../../../lib/ai'

const schema = z.object({
  location: z.string().min(1),
  radiusKm: z.number().min(0.5).max(50),
  activity: z.string().optional(),
  time: z.string().optional(),
  excludeNames: z.array(z.string()).optional(),
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
    const { location, radiusKm, activity = '', time, excludeNames = [] } = parsed.data

    const coords = await geocode(location)
    if (!coords) {
      return NextResponse.json(
        { error: 'Could not find that location. Try a city or address.' },
        { status: 400 }
      )
    }

    const places = await fetchNearbyPlaces(
      coords.lat,
      coords.lon,
      radiusKm,
      activity,
      excludeNames,
      time
    )

    if (places.length === 0) {
      return NextResponse.json({
        places: [],
        message: 'No places found. Try a larger radius or different location.',
      })
    }

    const enhanced = await enhancePlacesWithLlama(places, {
      activity,
      location,
    })

    return NextResponse.json({ places: enhanced })
  } catch (error) {
    console.error('Places API error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
