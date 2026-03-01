/**
 * Test: Overpass places search with opening_hours filtering for Seattle, pizza, 6 PM
 * Run: node scripts/test-overpass-hours.mjs
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const LAT = 47.6062
const LON = -122.3321
const RADIUS = 5000
const TIME = '18:00' // 6 PM

const [reqHour, reqMin] = TIME.split(':').map(Number)
const reqMinutes = reqHour * 60 + reqMin
console.log(`Requested time: ${TIME} = ${reqMinutes} minutes from midnight\n`)

// Same query the app uses for "default" intent (pizza/restaurant)
const query = `
[out:json][timeout:15];
(
  nwr["amenity"~"^(restaurant|cafe|bar|pub|fast_food|food_court)$"](around:${RADIUS},${LAT},${LON});
);
out center tags;
`.trim()

const res = await fetch(OVERPASS_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: `data=${encodeURIComponent(query)}`,
})

const data = await res.json()
const elements = data.elements || []
console.log(`Total OSM elements returned: ${elements.length}\n`)
console.log('='.repeat(70))

// Replicate isOpenAtTime from lib/places.ts
function isOpenAtTime(openingHours, time) {
  if (!openingHours || !time) return null
  const [reqHour, reqMin] = time.split(':').map(Number)
  if (isNaN(reqHour)) return null
  const reqMinutes = reqHour * 60 + (reqMin || 0)

  const DAY_MAP = { Mo: 0, Tu: 1, We: 2, Th: 3, Fr: 4, Sa: 5, Su: 6 }

  const rules = openingHours.split(';').map((r) => r.trim()).filter(Boolean)
  let parsedAnyTimeRule = false

  for (const rule of rules) {
    if (rule === '24/7') return true
    const withDay = rule.match(/^([A-Za-z,\-\s]+?)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/)
    const bareTime = !withDay ? rule.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/) : null
    if (!withDay && !bareTime) continue
    parsedAnyTimeRule = true
    const openPart = withDay ? withDay[2] : bareTime[1]
    const closePart = withDay ? withDay[3] : bareTime[2]
    const openMin = (() => { const [h, mn] = openPart.split(':').map(Number); return h * 60 + mn })()
    const closeMin = (() => { const [h, mn] = closePart.split(':').map(Number); return h * 60 + mn })()
    const inTimeRange = closeMin > openMin
      ? reqMinutes >= openMin && reqMinutes < closeMin
      : reqMinutes >= openMin || reqMinutes < closeMin
    if (inTimeRange) return true
  }
  return parsedAnyTimeRule ? false : null
}

let kept = 0, filtered = 0, noHours = 0
const seen = new Set()

for (const el of elements) {
  const name = el.tags?.name || el.tags?.brand || 'Unnamed'
  if (seen.has(name.toLowerCase())) continue
  seen.add(name.toLowerCase())

  const oh = el.tags?.opening_hours
  if (!oh) {
    noHours++
    if (kept < 5) console.log(`[ NO HOURS ] ${name}`)
    kept++
    continue
  }

  const open = isOpenAtTime(oh, TIME)
  if (open === false) {
    filtered++
    console.log(`❌ FILTERED  ${name}  |  hours: ${oh}`)
  } else if (open === true) {
    kept++
    console.log(`✅ KEPT      ${name}  |  hours: ${oh}`)
  } else {
    noHours++
    kept++
    console.log(`[ UNKNOWN  ] ${name}  |  hours: ${oh}  (unrecognised format, kept)`)
  }

  if (kept + filtered >= 20) break
}

console.log('\n' + '='.repeat(70))
console.log(`Summary: kept=${kept}  filtered=${filtered}  no-hours-data=${noHours}`)
