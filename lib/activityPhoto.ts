/**
 * Returns a stable, category-specific photo URL using Picsum Photos.
 * Picsum uses a numeric seed — the same seed always returns the same image.
 * No API key required, CDN-backed, highly reliable.
 */

// Hand-picked Picsum IDs that visually match each category
const CATEGORY_SEEDS: Record<string, number> = {
  coffee:   431,   // warm coffee shop interior
  food:     292,   // restaurant / food table
  drinks:   274,   // bar / night atmosphere
  dessert:  403,   // sweet / pastel bakery
  bowling:  325,   // indoor sport / lanes
  cinema:   384,   // dark cinematic mood
  outdoors: 280,   // nature / park / greenery
  shopping: 399,   // bright retail / city street
  gaming:   367,   // screens / tech glow
  arts:     355,   // gallery / colourful art
  fitness:  312,   // gym / workout space
  default:  338,   // city / social scene
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
 * Returns a Picsum Photos URL for the given category.
 * Uses a fixed seed per category so the image is always the same.
 * Format: https://picsum.photos/seed/{id}/{width}/{height}
 */
export function getActivityPhotoUrl(
  category: ActivityCategory,
  width = 800,
  height = 400
): string {
  const seed = CATEGORY_SEEDS[category] ?? CATEGORY_SEEDS.default
  return `https://picsum.photos/id/${seed}/${width}/${height}`
}
