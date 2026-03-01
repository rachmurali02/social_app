'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type Suggestion = { display_name: string; lat: number; lon: number; place_id: number }

interface LocationAutocompleteProps {
  name: string
  defaultValue?: string
  placeholder?: string
  className?: string
  required?: boolean
}

export default function LocationAutocomplete({
  name,
  defaultValue = '',
  placeholder,
  className,
  required,
}: LocationAutocompleteProps) {
  const [value, setValue] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) {
      setSuggestions([])
      return
    }
    setLoading(true)
    try {
      const r = await fetch(`/api/geocode/search?q=${encodeURIComponent(q.trim())}&limit=5`)
      const d = await r.json()
      setSuggestions(d.suggestions || [])
      setOpen(true)
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setValue(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 200)
  }

  const handleSelect = (s: Suggestion) => {
    setValue(s.display_name)
    setSuggestions([])
    setOpen(false)
  }

  const handleBlur = () => {
    setTimeout(() => setOpen(false), 150)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative flex-1">
      <input
        type="text"
        name={name}
        value={value}
        onChange={handleInputChange}
        onFocus={() => value.length >= 2 && suggestions.length > 0 && setOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
        required={required}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-xl bg-white dark:bg-neutral-900 backdrop-blur border border-neutral-200 dark:border-white/20 overflow-hidden shadow-xl max-h-48 overflow-y-auto">
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              role="option"
              aria-selected="false"
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect(s)
              }}
              className="px-4 py-3 text-neutral-900 dark:text-white/90 hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer text-sm border-b border-neutral-100 dark:border-white/5 last:border-0"
            >
              {s.display_name}
            </li>
          ))}
        </ul>
      )}
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 dark:border-white/30 border-t-orange-500 dark:border-t-white" />
        </div>
      )}
    </div>
  )
}
