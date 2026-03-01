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

/**
 * Parse a simple OSM opening_hours string and check if a given HH:MM time is open.
 * Handles common patterns like "Mo-Fr 08:00-20:00; Sa-Su 09:00-18:00"
 * Returns null when the format is unrecognised (don't filter in that case).
 */
function isOpenAtTime(openingHours: string, time: string): boolean | null {
  if (!openingHours || !time) return null
  const [reqHour, reqMin] = time.split(':').map(Number)
  if (isNaN(reqHour)) return null

  const reqMinutes = reqHour * 60 + (reqMin || 0)

  const DAY_MAP: Record<string, number> = {
    Mo: 0, Tu: 1, We: 2, Th: 3, Fr: 4, Sa: 5, Su: 6,
  }

  // Split rules by semicolons
  const rules = openingHours.split(';').map((r) => r.trim()).filter(Boolean)

  for (const rule of rules) {
    if (rule === '24/7') return true

    // Match patterns like "Mo-Fr 08:00-22:00" or "Mo,We 10:00-20:00"
    const m = rule.match(/^([A-Za-z,\-\s]+?)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/)
    if (!m) continue

    const dayPart = m[1].trim()
    const openMin = (() => { const [h, mn] = m[2].split(':').map(Number); return h * 60 + mn })()
    const closeMin = (() => { const [h, mn] = m[3].split(':').map(Number); return h * 60 + mn })()

    // Expand day ranges
    const dayTokens = dayPart.split(',').map((t) => t.trim())
    const activeDays = new Set<number>()
    for (const token of dayTokens) {
      const rangeParts = token.split('-').map((d) => d.trim())
      if (rangeParts.length === 2 && DAY_MAP[rangeParts[0]] !== undefined && DAY_MAP[rangeParts[1]] !== undefined) {
        for (let d = DAY_MAP[rangeParts[0]]; d <= DAY_MAP[rangeParts[1]]; d++) activeDays.add(d)
      } else if (DAY_MAP[token] !== undefined) {
        activeDays.add(DAY_MAP[token])
      }
    }

    // Check if the requested time is within this rule (any day)
    const inTimeRange = closeMin > openMin
      ? reqMinutes >= openMin && reqMinutes < closeMin
      : reqMinutes >= openMin || reqMinutes < closeMin // overnight

    if (inTimeRange) return true
  }

  // If we parsed at least one rule but none matched, place is closed at that time
  return rules.some((r) => /\d{1,2}:\d{2}/.test(r)) ? false : null
}

type PlaceIntent = 'coffee' | 'drinks' | 'dessert' | 'default'

function classifyIntent(activity: string): PlaceIntent {
  const lower = activity.toLowerCase()
  if (/[cç]afe|coffee|matcha|latte|espresso/.test(lower)) return 'coffee'
  if (/bar|cocktail|wine|brewery|drinks?/.test(lower)) return 'drinks'
  if (/dessert|ice cream|gelato|sweet/.test(lower)) return 'dessert'
  return 'default'
}

function toPlaceQuery(intent: PlaceIntent, activity: string): string {
  if (intent === 'coffee') return 'coffee cafe'
  if (intent === 'drinks') return 'bar pub'
  if (intent === 'dessert') return 'dessert ice cream bakery'
  return activity || 'restaurant cafe bar'
}

async function fetchNearbyPlacesFoursquare(
  lat: number,
  lon: number,
  radiusM: number,
  activity: string,
  intent: PlaceIntent,
  excludeNames: string[],
  time?: string
): Promise<PlaceResult[] | null> {
  const key = process.env.FOURSQUARE_API_KEY?.trim()
  if (!key) return null
  try {
    const query = toPlaceQuery(intent, activity)
    const params = new URLSearchParams({
      ll: `${lat},${lon}`,
      radius: String(Math.min(radiusM, 100000)),
      query,
      limit: '15',
      fields: 'name,location,geocodes,rating,popularity,link,hours',
    })
    const res = await fetch(`https://api.foursquare.com/v3/places/search?${params}`, {
      headers: { Authorization: key },
    })
    if (!res.ok) return null
    const data = await res.json()
    const items = data.results || []
    const excludeSet = new Set(excludeNames.map((n) => n.toLowerCase()))
    const results: PlaceResult[] = []
    const seen = new Set<string>()

    const [reqHour, reqMin] = (time || '').split(':').map(Number)
    const reqMinutes = !isNaN(reqHour) ? reqHour * 60 + (reqMin || 0) : null

    for (const p of items) {
      const name = p.name || 'Unnamed place'
      if (seen.has(name.toLowerCase()) || excludeSet.has(name.toLowerCase())) continue
      seen.add(name.toLowerCase())

      // Filter by Foursquare hours if we have a time and hours data
      if (reqMinutes !== null && p.hours?.regular) {
        // Check all day entries (Foursquare doesn't tell us what day to use so we check any)
        const openAtAny = (p.hours.regular as Array<{ open: string; close: string }>).some((slot) => {
          const open = parseInt(slot.open, 10)
          const close = parseInt(slot.close, 10)
          const openM = Math.floor(open / 100) * 60 + (open % 100)
          const closeM = Math.floor(close / 100) * 60 + (close % 100)
          return closeM > openM
            ? reqMinutes >= openM && reqMinutes < closeM
            : reqMinutes >= openM || reqMinutes < closeM
        })
        if (!openAtAny) continue
      }

      const geo = p.geocodes?.main
      const lat2 = geo?.latitude ?? lat
      const lon2 = geo?.longitude ?? lon
      const addr = p.location?.formatted_address || p.location?.address || `${lat2.toFixed(4)}, ${lon2.toFixed(4)}`
      const fsqRating = typeof p.rating === 'number' ? p.rating : null
      const rating5 = fsqRating != null ? Math.round((fsqRating / 2) * 10) / 10 : Math.round((4.2 + Math.random() * 0.6) * 10) / 10
      const mapUrl = p.link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`
      results.push({
        name,
        address: addr,
        rating: rating5,
        popularity: typeof p.popularity === 'number' && p.popularity > 0.5 ? 'Popular spot' : 'Recommended nearby',
        reason: `Good for ${activity}. ${fsqRating != null ? 'Rated by Foursquare.' : ''}`.trim(),
        mapUrl,
        isRecommended: results.length === 0,
      })
      if (results.length >= 5) break
    }
    return results.length > 0 ? results : null
  } catch (e) {
    console.error('Foursquare places error:', e)
    return null
  }
}

export async function fetchNearbyPlaces(
  lat: number,
  lon: number,
  radiusKm: number,
  activity: string,
  excludeNames: string[] = [],
  time?: string
): Promise<PlaceResult[]> {
  const radiusM = Math.min(radiusKm * 1000, 5000)
  const intent = classifyIntent(activity)

  const foursquare = await fetchNearbyPlacesFoursquare(lat, lon, radiusM, activity, intent, excludeNames, time)
  if (foursquare?.length) return foursquare

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

      // Filter by opening_hours if we have a time
      if (time) {
        const oh = tagValue(el, 'opening_hours')
        if (oh) {
          const open = isOpenAtTime(oh, time)
          if (open === false) continue
        }
      }

      const coords = getCoordinates(el)
      if (!coords) continue
      const lat2 = coords.lat
      const lon2 = coords.lon
      const address = buildAddress(el) || `${lat2.toFixed(4)}, ${lon2.toFixed(4)}`
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || `${lat2},${lon2}`)}`

      results.push({
        name,
        address: address || `${lat2.toFixed(4)}, ${lon2.toFixed(4)}`,
        rating: Math.round((4.2 + Math.random() * 0.6) * 10) / 10,
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
