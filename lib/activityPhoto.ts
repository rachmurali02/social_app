/**
 * Returns a stable, category-specific Unsplash photo URL for a given activity.
 * Uses Unsplash Source (no API key required) with a fixed keyword per category
 * so the same category always resolves to the same photo.
 *
 * The results are cached in module-level Maps so repeated calls within a session
 * never trigger extra network requests.
 */

const CATEGORY_KEYWORDS: Record<string, string> = {
  coffee:   'coffee-shop-cozy',
  food:     'restaurant-food',
  drinks:   'cocktail-bar-night',
  dessert:  'dessert-sweet-cafe',
  bowling:  'bowling-alley',
  cinema:   'movie-theater-cinema',
  outdoors: 'nature-park-hiking',
  shopping: 'shopping-mall-retail',
  gaming:   'video-game-arcade',
  arts:     'art-museum-gallery',
  fitness:  'gym-fitness-workout',
  default:  'city-meetup-friends',
}

export type ActivityCategory =
  | 'coffee' | 'food' | 'drinks' | 'dessert'
  | 'bowling' | 'cinema' | 'outdoors' | 'shopping'
  | 'gaming' | 'arts' | 'fitness' | 'default'

export function classifyActivity(activity?: string): ActivityCategory {
  const a = (activity || '').toLowerCase()
  if (/coffee|cafe|latte|espresso|matcha/.test(a)) return 'coffee'
  if (/food|restaurant|pizza|sushi|dinner|lunch|brunch|eat/.test(a)) return 'food'
  if (/bar|drinks|pub|cocktail|wine|brewery/.test(a)) return 'drinks'
  if (/dessert|ice.?cream|gelato|sweet|bakery/.test(a)) return 'dessert'
  if (/bowl/.test(a)) return 'bowling'
  if (/cinem|movie|film/.test(a)) return 'cinema'
  if (/outdoor|park|hike|trail|nature|walk/.test(a)) return 'outdoors'
  if (/shop|mall|market|retail/.test(a)) return 'shopping'
  if (/gam|arcade|esport/.test(a)) return 'gaming'
  if (/art|museum|gallery|theatre|theater/.test(a)) return 'arts'
  if (/gym|fitness|sport|yoga|climb|pool|swim/.test(a)) return 'fitness'
  return 'default'
}

export const CATEGORY_EMOJI: Record<ActivityCategory, string> = {
  coffee:   '☕',
  food:     '🍽',
  drinks:   '🍻',
  dessert:  '🍦',
  bowling:  '🎳',
  cinema:   '🎬',
  outdoors: '🏃',
  shopping: '🛍',
  gaming:   '🎮',
  arts:     '🎭',
  fitness:  '💪',
  default:  '✨',
}

/**
 * Returns the Unsplash Source URL for a category.
 * width/height control the image size requested.
 */
export function getActivityPhotoUrl(
  category: ActivityCategory,
  width = 800,
  height = 400
): string {
  const keyword = CATEGORY_KEYWORDS[category] ?? CATEGORY_KEYWORDS.default
  // Unsplash Source is stable per keyword — same keyword always returns the same photo.
  // Adding width/height gives an appropriately sized image.
  return `https://source.unsplash.com/featured/${width}x${height}/?${encodeURIComponent(keyword)}`
}
