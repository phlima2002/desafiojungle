import { test as base, expect, type Page } from '@playwright/test'

export type ScenarioName =
  | 'default'
  | 'instant'
  | 'empty-results'
  | 'slow-network'
  | 'variable-latency'
  | 'offline'
  | 'flaky-network'
  | 'server-error'
  | 'session-expired'
  | 'favorites-fail'
  | 'coupon-expired'
  | 'price-changed'
  | 'edition-sold-out'
  | 'order-timeout'
  | 'payment-declined'
  | 'duplicate-events'

declare global {
  interface Window {
    __kurio?: {
      reset: () => void
      setScenario: (name: string) => void
      getScenario: () => string
      realtime: {
        connectionCount: () => number
        emitNftUpdate: (nftId: string) => void
        disconnectAll: () => void
      }
      setNftPrice: (nftId: string, price: string) => void
      setEditionAvailability: (nftId: string, editionId: string, available: number) => void
      inspect: () => {
        orders: Array<{ id: string; status: string; userId: string }>
        carts: Array<{
          id: string
          userId: string | null
          items: Array<{ nftId: string; editionId: string; quantity: number }>
        }>
      }
    }
  }
}

export const USERS = {
  ana: {
    email: 'ana@kurio.test',
    password: 'kurio2026',
    displayName: 'Ana Ribeiro',
    username: 'anaribeiro',
  },
  bruno: {
    email: 'bruno@kurio.test',
    password: 'kurio2026',
    displayName: 'Bruno Tavares',
    username: 'btavares',
  },
} as const

/**
 * Every test starts from a freshly seeded database in the `instant` scenario,
 * so nothing carries over between tests and timings never make a test flaky.
 */
export async function bootstrap(page: Page, scenario: ScenarioName = 'instant') {
  await page.goto(`/?scenario=${scenario}`)
  await page.waitForFunction(() => Boolean(window.__kurio))
  await page.evaluate(() => window.__kurio!.reset())
  await page.reload()
  await page.waitForFunction(() => Boolean(window.__kurio))
  // Wait for the shell to be interactive so that keyboard-driven tests do not
  // race hydration.
  await page.getByRole('link', { name: 'Kurio, página inicial' }).waitFor()
}

/** Waits for the mock control surface after a full page load. */
export async function waitForMocks(page: Page) {
  await page.waitForFunction(() => Boolean(window.__kurio))
}

export async function useScenario(page: Page, scenario: ScenarioName) {
  await page.evaluate((name) => window.__kurio!.setScenario(name), scenario)
}

/**
 * Asserts the signed-in identity through the API rather than the header, so the
 * same assertion holds on mobile, where the account link lives inside the menu.
 */
export async function expectSignedIn(page: Page, displayName: string | null) {
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          // The worker may still be booting right after a reload; the poll
          // retries until the mocked API answers.
          if (!window.__kurio) return undefined
          try {
            const response = await fetch('/api/session')
            const state = (await response.json()) as
              { authenticated: true; user: { displayName: string } } | { authenticated: false }
            return state.authenticated ? state.user.displayName : null
          } catch {
            return undefined
          }
        }),
      { timeout: 15_000 },
    )
    .toBe(displayName)
}

export async function login(page: Page, user: keyof typeof USERS = 'ana') {
  const credentials = USERS[user]
  await page.goto('/entrar')
  await page.getByRole('main').getByLabel('E-mail').fill(credentials.email)
  await page.getByRole('main').getByLabel('Senha', { exact: true }).fill(credentials.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).not.toHaveURL(/\/entrar/)
  await expectSignedIn(page, credentials.displayName)
}

export const test = base
export { expect }
