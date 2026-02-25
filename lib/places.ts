const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const USER_AGENT = 'MeetUpAI/1.0 (social app; contact optional)'

export interface PlaceResult {
  name: string
  address: string
  rating: number
  popularity: string
  reason: string
  mapUrl: string
  isRecommended?: boolean
}

export async function geocode(query: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1',
    })
    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
    })
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    const first = data[0]
    return {
      lat: parseFloat(first.lat),
      lon: parseFloat(first.lon),
    }
  } catch (e) {
    console.error('Geocode error:', e)
    return null
  }
}

function tagValue(el: { tags?: Record<string, string> }, key: string): string {
  return el.tags?.[key] || ''
}

function buildAddress(el: { tags?: Record<string, string>; lat?: number; lon?: number }): string {
  const t = el.tags || {}
  const parts = [t['addr:street'], t['addr:housenumber'], t['addr:city'], t['addr:country']].filter(Boolean)
  if (parts.length) return parts.join(', ')
  if (el.lat != null && el.lon != null) return `${el.lat.toFixed(4)}, ${el.lon.toFixed(4)}`
  return ''
}

export async function fetchNearbyPlaces(
  lat: number,
  lon: number,
  radiusKm: number,
  activity: string,
  excludeNames: string[] = []
): Promise<PlaceResult[]> {
  const radiusM = Math.min(radiusKm * 1000, 5000)
  const activityLower = activity.toLowerCase()
  let amenityFilter = 'restaurant|cafe|bar|food_court|fast_food'
  if (activityLower.includes('coffee') || activityLower.includes('cafe')) {
    amenityFilter = 'cafe|restaurant'
  } else if (activityLower.includes('drink') || activityLower.includes('bar')) {
    amenityFilter = 'bar|pub|restaurant'
  }

  const query = `
[out:json][timeout:15];
node(around:${radiusM},${lat},${lon})["amenity"~"${amenityFilter}"];
out body;
  `.trim()

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    })
    const data = await res.json()
    const elements = data.elements || []
    const excludeSet = new Set(excludeNames.map((n) => n.toLowerCase()))
    const results: PlaceResult[] = []
    const seen = new Set<string>()

    for (const el of elements) {
      const name = tagValue(el, 'name') || tagValue(el, 'brand') || 'Unnamed place'
      if (seen.has(name.toLowerCase()) || excludeSet.has(name.toLowerCase())) continue
      seen.add(name.toLowerCase())

      const lat2 = el.lat!
      const lon2 = el.lon!
      const address = buildAddress(el) || `${lat2.toFixed(4)}, ${lon2.toFixed(4)}`
      const mapUrl = `https://www.openstreetmap.org/?mlat=${lat2}&mlon=${lon2}#map=17/${lat2}/${lon2}`

      results.push({
        name,
        address: address || `${lat2.toFixed(4)}, ${lon2.toFixed(4)}`,
        rating: 4.2 + Math.random() * 0.6,
        popularity: 'Popular with locals',
        reason: `Good for ${activity}. Nearby.`,
        mapUrl,
        isRecommended: results.length === 0,
      })
      if (results.length >= 5) break
    }

    return results
  } catch (e) {
    console.error('Overpass error:', e)
    return []
  }
}
