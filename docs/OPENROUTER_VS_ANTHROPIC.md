# Place Recommendations

## Current Setup (free)

- **Places API** (`/api/places`): Uses **Nominatim** (geocode) + **Overpass** (OpenStreetMap). Free, no API key. Returns nearby cafes, bars, restaurants from OSM data.

## Adding LLM Recommendations (optional)

To add AI-powered place suggestions on top of Overpass results, you could integrate **OpenRouter** (or another LLM provider). OpenRouter offers 290+ models (GPT-4, Gemini, Llama, DeepSeek, etc.) via a single API, with flexible pricing and fallbacks.
