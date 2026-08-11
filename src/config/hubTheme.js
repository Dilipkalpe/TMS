/** Shared Option B command-center theme tokens for all hubs. */

export const HUB_TONES = [
  'blue', 'teal', 'indigo', 'amber', 'violet', 'emerald', 'sky', 'rose',
  'orange', 'cyan', 'green', 'stone', 'lime', 'slate',
]

/** Assign rotating accent tones / chips when cards omit them. */
export function withHubTheme(cards = [], { chip = 'Open' } = {}) {
  return cards.map((card, i) => ({
    ...card,
    tone: card.tone || HUB_TONES[i % HUB_TONES.length],
    chip: card.chip || chip,
  }))
}

export function hubSection(title, description, cards, themeOpts) {
  return {
    title,
    description,
    cards: withHubTheme(cards, themeOpts),
  }
}
