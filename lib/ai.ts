import type { PlaceResult } from './places'

type LlamaPlaceRecommendation = {
  name: string
  reason?: string
  isRecommended?: boolean
}

const LLAMA_API_URL = process.env.LLAMA_API_URL
const LLAMA_API_KEY = process.env.LLAMA_API_KEY
const LLAMA_MODEL = process.env.LLAMA_MODEL || 'llama-3.1-70b-instruct'

export async function enhancePlacesWithLlama(
  places: PlaceResult[],
  params: { activity: string; location: string }
): Promise<PlaceResult[]> {
  if (!LLAMA_API_URL || !LLAMA_API_KEY) return places
  if (!places.length) return places

  try {
    const payload = {
      model: LLAMA_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are an assistant that helps pick meetup spots and explain why they are good. ' +
            'Given a list of candidate places, return JSON describing an updated reason for each place ' +
            'and which one or two should be highlighted as recommended. Respond ONLY with JSON, no extra text.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            activity: params.activity,
            location: params.location,
            places: places.map((p) => ({
              name: p.name,
              address: p.address,
              rating: p.rating,
              popularity: p.popularity,
              reason: p.reason,
            })),
          }),
        },
      ],
      temperature: 0.7,
    }

    const res = await fetch(LLAMA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LLAMA_API_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      console.error('LLaMA recommend error:', await res.text())
      return places
    }

    const data = await res.json()
    const content: string | undefined =
      data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text
    if (!content) return places

    let parsed: { places?: LlamaPlaceRecommendation[] } | LlamaPlaceRecommendation[]
    try {
      parsed = JSON.parse(content)
    } catch {
      // Sometimes the model might wrap JSON in code fences; try to strip them.
      const cleaned = content.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(cleaned)
    }

    const recsArray: LlamaPlaceRecommendation[] = Array.isArray(parsed)
      ? parsed
      : parsed.places ?? []
    if (!recsArray.length) return places

    const recMap = new Map<string, LlamaPlaceRecommendation>()
    for (const r of recsArray) {
      if (!r?.name) continue
      recMap.set(r.name.toLowerCase(), r)
    }

    // If nothing explicitly marked recommended, use the first entry.
    const anyRecommended = recsArray.some((r) => r.isRecommended)
    const recommendedName = !anyRecommended && recsArray[0]?.name ? recsArray[0].name.toLowerCase() : null

    return places.map((p) => {
      const key = p.name.toLowerCase()
      const rec = recMap.get(key)
      return {
        ...p,
        reason: rec?.reason?.trim() || p.reason,
        isRecommended: rec?.isRecommended ?? (recommendedName ? key === recommendedName : p.isRecommended),
      }
    })
  } catch (error) {
    console.error('LLaMA integration error:', error)
    return places
  }
}

