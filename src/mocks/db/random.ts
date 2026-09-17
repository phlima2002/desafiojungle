/**
 * Deterministic PRNG (mulberry32). Every fixture derives from the configured
 * seed, so the catalogue, prices and availability are byte-identical on every
 * run — which is what makes the Playwright visual baselines stable.
 */
export function createRandom(seed: number) {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)]!,
    bool: (probability = 0.5) => next() < probability,
    /** Two-decimal ETH amount as a decimal string. */
    eth: (min: number, max: number) => (min + next() * (max - min)).toFixed(2),
  }
}

export type Random = ReturnType<typeof createRandom>
