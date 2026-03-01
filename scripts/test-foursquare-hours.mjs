/**
 * Test: Foursquare places search with hours filtering for Seattle, pizza, 6 PM
 * Run: node scripts/test-foursquare-hours.mjs
 */

const FOURSQUARE_API_KEY = '5GAERI2U0GRS4DBF4WTFA4UFLZHWPWI1NR224TAL1FACYCT1'
const LAT = 47.6062
const LON = -122.3321
const RADIUS = 5000
const TIME = '18:00' // 6 PM
const QUERY = 'pizza restaurant'

const [reqHour, reqMin] = TIME.split(':').map(Number)
const reqMinutes = reqHour * 60 + reqMin
console.log(`\nRequested time: ${TIME} = ${reqMinutes} minutes from midnight\n`)

const params = new URLSearchParams({
  ll: `${LAT},${LON}`,
  radius: String(RADIUS),
  query: QUERY,
  limit: '15',
  fields: 'name,location,hours,rating,popularity',
})

const res = await fetch(`https://api.foursquare.com/v3/places/search?${params}`, {
  headers: { Authorization: FOURSQUARE_API_KEY },
})
console.log('Auth status:', res.status)

if (!res.ok) {
  console.error('Foursquare error:', res.status, await res.text())
  process.exit(1)
}

const data = await res.json()
const items = data.results || []
console.log(`Total results from Foursquare: ${items.length}\n`)
console.log('='.repeat(70))

for (const p of items) {
  const name = p.name || 'Unnamed'
  const hasHours = !!(p.hours?.regular)

  if (!hasHours) {
    console.log(`[ NO HOURS ] ${name}  → kept (no hours data)`)
    continue
  }

  const slots = p.hours.regular
  console.log(`\n${name}`)
  console.log(`  Raw hours slots (${slots.length}):`)

  let openAtTime = false
  for (const slot of slots) {
    const open = parseInt(slot.open, 10)
    const close = parseInt(slot.close, 10)
    const openM = Math.floor(open / 100) * 60 + (open % 100)
    const closeM = Math.floor(close / 100) * 60 + (close % 100)
    const covers = closeM > openM
      ? reqMinutes >= openM && reqMinutes < closeM
      : reqMinutes >= openM || reqMinutes < closeM
    console.log(`    open=${slot.open} (${openM}min)  close=${slot.close} (${closeM}min)  covers 6PM? ${covers}  day=${slot.day ?? 'any'}`)
    if (covers) openAtTime = true
  }

  const verdict = openAtTime ? '✅ KEPT (open at 6 PM)' : '❌ FILTERED OUT (closed at 6 PM)'
  console.log(`  → ${verdict}`)
}

console.log('\n' + '='.repeat(70))
console.log('Done.')
