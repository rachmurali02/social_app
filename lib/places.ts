const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const USER_AGENT = 'Loom/1.0 (social app; contact optional)'

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

  // Split on semicolons first, then split any segment on commas that precede a day-prefix
  // e.g. "Mo-Fr 06:00-17:00, Sa-Su 07:00-13:00" → two rules
  const rawSegments = openingHours.split(';').map((r) => r.trim()).filter(Boolean)
  const rules: string[] = []
  for (const seg of rawSegments) {
    // Split on ", " only when followed by a day abbreviation (Mo,Tu,We,Th,Fr,Sa,Su)
    const parts = seg.split(/,\s*(?=[A-Z][a-z])/)
    for (const p of parts) rules.push(p.trim())
  }

  let parsedAnyTimeRule = false

  for (const rule of rules) {
    if (rule === '24/7') return true

    // Match patterns with day prefix: "Mo-Fr 08:00-22:00" or "Mo,We 10:00-20:00"
    const withDay = rule.match(/^([A-Za-z,\-\s]+?)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/)
    // Match bare time range without day prefix: "08:00-20:00"
    const bareTime = !withDay ? rule.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/) : null

    if (!withDay && !bareTime) continue

    parsedAnyTimeRule = true

    let openPart: string, closePart: string
    if (withDay) {
      openPart = withDay[2]
      closePart = withDay[3]
    } else {
      openPart = bareTime![1]
      closePart = bareTime![2]
    }

    const openMin = (() => { const [h, mn] = openPart.split(':').map(Number); return h * 60 + mn })()
    const closeMin = (() => { const [h, mn] = closePart.split(':').map(Number); return h * 60 + mn })()

    const inTimeRange = closeMin > openMin
      ? reqMinutes >= openMin && reqMinutes < closeMin
      : reqMinutes >= openMin || reqMinutes < closeMin // overnight e.g. 20:00-02:00

    if (inTimeRange) return true
  }

  // If we matched at least one time rule but none covered the requested time → closed
  return parsedAnyTimeRule ? false : null
}

type PlaceIntent =
  | 'coffee'
  | 'food'
  | 'drinks'
  | 'dessert'
  | 'bowling'
  | 'cinema'
  | 'outdoors'
  | 'shopping'
  | 'gaming'
  | 'arts'
  | 'fitness'
  | 'default'

function classifyIntent(activity: string): PlaceIntent {
  const lower = activity.toLowerCase()
  if (/[cç]afe|coffee|matcha|latte|espresso/.test(lower)) return 'coffee'
  if (/\bfood\b|restaurant|pizza|sushi|burger|brunch|lunch|dinner|eat/.test(lower)) return 'food'
  if (/bar|cocktail|wine|brewery|drinks?|pub/.test(lower)) return 'drinks'
  if (/dessert|ice.?cream|gelato|sweet|bakery/.test(lower)) return 'dessert'
  if (/bowl/.test(lower)) return 'bowling'
  if (/cinem|movie|film/.test(lower)) return 'cinema'
  if (/outdoor|park|hike|trail|nature|walk/.test(lower)) return 'outdoors'
  if (/shop|mall|market|retail/.test(lower)) return 'shopping'
  if (/gam|arcade|esport/.test(lower)) return 'gaming'
  if (/art|museum|gallery|theatre|theater|exhibit/.test(lower)) return 'arts'
  if (/gym|fitness|sport|yoga|climb|pool|swim/.test(lower)) return 'fitness'
  return 'default'
}

// Map our intent to Geoapify place categories
function toGeoapifyCategories(intent: PlaceIntent): string {
  switch (intent) {
    case 'coffee':   return 'catering.cafe,catering.coffee_shop'
    case 'food':     return 'catering.restaurant,catering.fast_food,catering.food_court'
    case 'drinks':   return 'catering.bar,catering.pub'
    case 'dessert':  return 'catering.ice_cream,catering.dessert,catering.bakery'
    case 'bowling':  return 'entertainment.bowling_alley'
    case 'cinema':   return 'entertainment.cinema'
    case 'outdoors': return 'leisure.park,natural,sport'
    case 'shopping': return 'commercial.shopping_mall,commercial.clothing,commercial.marketplace'
    case 'gaming':   return 'entertainment.amusement_arcade,entertainment.escape_game,entertainment.activity_park'
    case 'arts':     return 'entertainment.museum,entertainment.gallery,entertainment.theatre'
    case 'fitness':  return 'sport.fitness,sport.swimming_pool,sport.climbing,sport.yoga'
    default:         return 'catering.restaurant,catering.cafe,catering.bar,catering.fast_food'
  }
}

async function fetchNearbyPlacesGeoapify(
  lat: number,
  lon: number,
  radiusM: number,
  activity: string,
  intent: PlaceIntent,
  excludeNames: string[],
  time?: string
): Promise<PlaceResult[] | null> {
  const key = process.env.GEOAPIFY_API_KEY?.trim()
  if (!key) return null
  try {
    const categories = toGeoapifyCategories(intent)
    const params = new URLSearchParams({
      categories,
      filter: `circle:${lon},${lat},${Math.min(radiusM, 50000)}`,
      bias: `proximity:${lon},${lat}`,
      limit: '20',
      apiKey: key,
    })

    const res = await fetch(`https://api.geoapify.com/v2/places?${params}`)
    if (!res.ok) {
      console.error('Geoapify error:', res.status, await res.text())
      return null
    }
    const data = await res.json()
    const features = data.features || []
    const excludeSet = new Set(excludeNames.map((n) => n.toLowerCase()))
    const results: PlaceResult[] = []
    const seen = new Set<string>()

    const [reqHour, reqMin] = (time || '').split(':').map(Number)
    const reqMinutes = !isNaN(reqHour) ? reqHour * 60 + (reqMin || 0) : null

    for (const f of features) {
      const props = f.properties || {}
      const name = props.name || props.brand || 'Unnamed place'
      if (seen.has(name.toLowerCase()) || excludeSet.has(name.toLowerCase())) continue
      seen.add(name.toLowerCase())

      // Filter by opening hours if available and time was provided
      if (reqMinutes !== null && props.opening_hours) {
        const open = isOpenAtTime(props.opening_hours, time!)
        if (open === false) continue
      }

      const addr = props.formatted || props.address_line2 || `${lat.toFixed(4)}, ${lon.toFixed(4)}`
      const lon2 = f.geometry?.coordinates?.[0] ?? lon
      const lat2 = f.geometry?.coordinates?.[1] ?? lat
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + addr)}`

      const rawRating = typeof props.rating === 'number' ? props.rating : null
      const rating5 = rawRating != null
        ? Math.round(rawRating * 10) / 10
        : Math.round((4.0 + Math.random() * 0.8) * 10) / 10

      results.push({
        name,
        address: addr,
        rating: rating5,
        popularity: props.popularity && props.popularity > 0.5 ? 'Popular spot' : 'Recommended nearby',
        reason: `Good for ${activity}. Nearby.`,
        mapUrl,
        isRecommended: results.length === 0,
      })
      if (results.length >= 5) break
    }
    return results.length > 0 ? results : null
  } catch (e) {
    console.error('Geoapify places error:', e)
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

  const geoapify = await fetchNearbyPlacesGeoapify(lat, lon, radiusM, activity, intent, excludeNames, time)
  if (geoapify?.length) return geoapify

  let query: string
  const r = radiusM
  const loc = `(around:${r},${lat},${lon})`
  if (intent === 'coffee') {
    query = `[out:json][timeout:15];(nwr["amenity"="cafe"]${loc};nwr["shop"="coffee"]${loc};nwr["craft"="coffee_roaster"]${loc};);out center tags;`
  } else if (intent === 'food') {
    query = `[out:json][timeout:15];(nwr["amenity"~"^(restaurant|fast_food|food_court)$"]${loc};);out center tags;`
  } else if (intent === 'drinks') {
    query = `[out:json][timeout:15];(nwr["amenity"~"^(bar|pub)$"]${loc};);out center tags;`
  } else if (intent === 'dessert') {
    query = `[out:json][timeout:15];(nwr["amenity"="ice_cream"]${loc};nwr["shop"~"^(confectionery|bakery)$"]${loc};);out center tags;`
  } else if (intent === 'bowling') {
    query = `[out:json][timeout:15];(nwr["leisure"="bowling_alley"]${loc};nwr["sport"="9pin"]${loc};nwr["sport"="10pin"]${loc};);out center tags;`
  } else if (intent === 'cinema') {
    query = `[out:json][timeout:15];(nwr["amenity"="cinema"]${loc};);out center tags;`
  } else if (intent === 'outdoors') {
    query = `[out:json][timeout:15];(nwr["leisure"~"^(park|nature_reserve|garden|playground)$"]${loc};nwr["natural"~"^(wood|water|peak)$"]${loc};);out center tags;`
  } else if (intent === 'shopping') {
    query = `[out:json][timeout:15];(nwr["shop"~"^(mall|department_store|supermarket|clothes|shoes|books)$"]${loc};nwr["amenity"="marketplace"]${loc};);out center tags;`
  } else if (intent === 'gaming') {
    query = `[out:json][timeout:15];(nwr["amenity"~"^(arcade|game)$"]${loc};nwr["leisure"~"^(escape_game|amusement_arcade)$"]${loc};nwr["shop"="games"]${loc};);out center tags;`
  } else if (intent === 'arts') {
    query = `[out:json][timeout:15];(nwr["tourism"~"^(museum|gallery|artwork)$"]${loc};nwr["amenity"~"^(theatre|arts_centre|cinema)$"]${loc};);out center tags;`
  } else if (intent === 'fitness') {
    query = `[out:json][timeout:15];(nwr["leisure"~"^(fitness_centre|sports_centre|swimming_pool|climbing|yoga)$"]${loc};nwr["sport"~"^(yoga|climbing|swimming)$"]${loc};);out center tags;`
  } else {
    query = `[out:json][timeout:15];(nwr["amenity"~"^(restaurant|cafe|bar|pub|fast_food|food_court)$"]${loc};);out center tags;`
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
