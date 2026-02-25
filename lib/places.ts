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

const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse'

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: 'json',
      zoom: '10',
    })
    const res = await fetch(`${NOMINATIM_REVERSE}?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
    })
    const data = await res.json()
    const addr = data.address || {}
    const parts = [
      addr.city || addr.town || addr.village || addr.municipality,
      addr.state || addr.county,
      addr.country,
    ].filter(Boolean)
    if (parts.length) return parts.join(', ')
    return data.display_name || null
  } catch (e) {
    console.error('Reverse geocode error:', e)
    return null
  }
}

export interface GeocodeSuggestion {
  display_name: string
  lat: number
  lon: number
  place_id: number
}

export async function geocodeSuggestions(query: string, limit = 5): Promise<GeocodeSuggestion[]> {
  if (!query || query.trim().length < 2) return []
  try {
    const params = new URLSearchParams({
      q: query.trim(),
      format: 'json',
      limit: String(limit),
      addressdetails: '1',
    })
    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
    })
    const data = await res.json()
    if (!Array.isArray(data)) return []
    return data.map((item: { display_name: string; lat: string; lon: string; place_id: number }) => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      place_id: item.place_id,
    }))
  } catch (e) {
    console.error('Geocode suggestions error:', e)
    return []
  }
}

export async function geocode(query: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const params = new URLSearchParams({
      q: query.trim(),
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

type OverpassElement = {
  tags?: Record<string, string>
  lat?: number
  lon?: number
  center?: {
    lat: number
    lon: number
  }
}

function tagValue(el: OverpassElement, key: string): string {
  return el.tags?.[key] || ''
}

function getCoordinates(el: OverpassElement): { lat: number; lon: number } | null {
  if (typeof el.lat === 'number' && typeof el.lon === 'number') {
    return { lat: el.lat, lon: el.lon }
  }
  if (el.center && typeof el.center.lat === 'number' && typeof el.center.lon === 'number') {
    return { lat: el.center.lat, lon: el.center.lon }
  }
  return null
}

function buildAddress(el: OverpassElement): string {
  const t = el.tags || {}
  const parts = [t['addr:street'], t['addr:housenumber'], t['addr:city'], t['addr:country']].filter(Boolean)
  if (parts.length) return parts.join(', ')
  const coords = getCoordinates(el)
  if (coords) return `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`
  return ''
}

type PlaceIntent = 'coffee' | 'drinks' | 'dessert' | 'default'

function classifyIntent(activity: string): PlaceIntent {
  const lower = activity.toLowerCase()
  if (/[cç]afe|coffee|matcha|latte|espresso/.test(lower)) return 'coffee'
  if (/bar|cocktail|wine|brewery|drinks?/.test(lower)) return 'drinks'
  if (/dessert|ice cream|gelato|sweet/.test(lower)) return 'dessert'
  return 'default'
}

export async function fetchNearbyPlaces(
  lat: number,
  lon: number,
  radiusKm: number,
  activity: string,
  excludeNames: string[] = []
): Promise<PlaceResult[]> {
  const radiusM = Math.min(radiusKm * 1000, 5000)
  const intent = classifyIntent(activity)

  let query: string
  if (intent === 'coffee') {
    // Cafes, coffee shops, and roasters
    query = `
[out:json][timeout:15];
(
  nwr["amenity"="cafe"](around:${radiusM},${lat},${lon});
  nwr["shop"="coffee"](around:${radiusM},${lat},${lon});
  nwr["craft"="coffee_roaster"](around:${radiusM},${lat},${lon});
);
out center tags;
    `.trim()
  } else if (intent === 'drinks') {
    // Bars and pubs (optionally some restaurants)
    query = `
[out:json][timeout:15];
(
  nwr["amenity"~"^(bar|pub)$"](around:${radiusM},${lat},${lon});
);
out center tags;
    `.trim()
  } else if (intent === 'dessert') {
    // Ice cream and sweet shops
    query = `
[out:json][timeout:15];
(
  nwr["amenity"="ice_cream"](around:${radiusM},${lat},${lon});
  nwr["shop"~"^(confectionery|bakery)$"](around:${radiusM},${lat},${lon});
);
out center tags;
    `.trim()
  } else {
    // General food/drink meetup
    query = `
[out:json][timeout:15];
(
  nwr["amenity"~"^(restaurant|cafe|bar|pub|fast_food|food_court)$"](around:${radiusM},${lat},${lon});
);
out center tags;
    `.trim()
  }

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    })
    const data = await res.json()
    const elements: OverpassElement[] = data.elements || []
    const excludeSet = new Set(excludeNames.map((n) => n.toLowerCase()))
    const results: PlaceResult[] = []
    const seen = new Set<string>()

    for (const el of elements) {
      const name = tagValue(el, 'name') || tagValue(el, 'brand') || 'Unnamed place'
      if (seen.has(name.toLowerCase()) || excludeSet.has(name.toLowerCase())) continue
      seen.add(name.toLowerCase())

      const coords = getCoordinates(el)
      if (!coords) continue
      const lat2 = coords.lat
      const lon2 = coords.lon
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
