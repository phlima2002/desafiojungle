/**
 * Fumaça sobre o build publicado. A suíte E2E cobre o comportamento; isto cobre
 * o *empacotamento*: que a aplicação funciona servida do caminho em que vai ser
 * publicada — inclusive de um subcaminho, como o GitHub Pages faz.
 *
 *   npm run build && npm run smoke
 *   VITE_BASE=/repo/ npm run build && VITE_BASE=/repo/ npm run smoke
 *
 * É o teste que pega o que a suíte não vê: caminho de asset sem prefixo, escopo
 * errado do service worker dos mocks, link direto sem fallback de SPA.
 */
import { chromium } from '@playwright/test'
import { preview } from 'vite'

const server = await preview({
  base: process.env.VITE_BASE || '/',
  preview: { port: 4196, strictPort: true },
})
const origin = server.resolvedUrls.local[0].replace(/\/$/, '')
console.log('serving at', origin)

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

async function step(name, fn) {
  try {
    await fn()
    console.log('OK  ', name)
  } catch (e) {
    console.log('FAIL', name, '-', String(e).split('\n')[0])
    process.exitCode = 1
  }
}

await page.goto(`${origin}/?scenario=instant`)
await page.waitForFunction(() => Boolean(window.__kurio), null, { timeout: 20000 })

await step('catálogo carrega', async () => {
  await page.locator('article h3 a').first().waitFor({ timeout: 15000 })
})
await step('herói usa o caminho com base', async () => {
  const src = await page.locator('main img').first().getAttribute('src')
  if (!src?.startsWith(process.env.VITE_BASE || '/')) throw new Error(`src=${src}`)
})
await step('navega para o detalhe', async () => {
  await page.locator('article h3 a').first().click()
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 15000 })
  if (!page.url().includes('/nft/')) throw new Error(page.url())
})
await step('adiciona ao carrinho', async () => {
  await page.getByRole('button', { name: 'Comprar' }).click()
  await page
    .getByRole('main')
    .getByRole('status')
    .filter({ hasText: 'Adicionado' })
    .waitFor({ timeout: 15000 })
})
await step('link direto funciona (fallback 404)', async () => {
  await page.goto(`${origin}/nft/emerald-ape-100`)
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 15000 })
})
await step('socket conecta', async () => {
  await page.waitForFunction(() => (window.__kurio?.realtime.connectionCount() ?? 0) > 0, null, {
    timeout: 15000,
  })
})
await step('sem erro de console', async () => {
  const real = errors.filter((e) => !/Download the React DevTools|\[MSW\]/i.test(e))
  if (real.length) throw new Error(real.slice(0, 2).join(' | '))
})

await browser.close()
await server.close()
process.exit(process.exitCode ?? 0)
