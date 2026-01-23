import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY on server' }, { status: 500 })
    }

    const body = await request.json()
    const { prompt } = body as { prompt: string }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Anthropic error:', errorText)
      return NextResponse.json({ error: 'Anthropic API error', detail: errorText }, { status: 500 })
    }

    const data = await response.json()
    let text = (data.content || [])
      .map((item: any) => (item.type === 'text' ? item.text : ''))
      .join('\n')
    text = text.replace(/```json|```/g, '').trim()

    let places
    try {
      places = JSON.parse(text)
    } catch (err) {
      console.error('Failed to parse Anthropic JSON:', text)
      return NextResponse.json({ error: 'Invalid JSON from Anthropic' }, { status: 500 })
    }

    return NextResponse.json({ places })
  } catch (error) {
    console.error('Recommendations API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}