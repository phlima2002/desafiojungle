/**
 * Captura as telas para revisão visual. Não faz parte da entrega automatizada —
 * a regressão visual fica em `tests/e2e/visual.spec.ts`. Uso:
 *
 *   node scripts/screens.mjs <desktop|mobile> <diretório de saída>
 */
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { preview } from 'vite'

const profile = process.argv[2] ?? 'desktop'
const outDir = process.argv[3] ?? '/tmp/art/screens'
const viewport = profile === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 }

const server = await preview({ preview: { port: 4190, strictPort: true } })
const origin = server.resolvedUrls.local[0].replace(/\/$/, '')
await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ['--no-sandbox'],
})
const context = await browser.newContext({ viewport, locale: 'pt-BR' })
const page = await context.newPage()

const settle = async () => {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForFunction(() => document.querySelectorAll('.skeleton').length === 0).catch(() => {})
  await page.waitForTimeout(400)
}

await page.goto(`${origin}/?scenario=instant`)
await page.waitForFunction(() => Boolean(window.__kurio))
await settle()

async function shot(name, path, before) {
  if (path) await page.goto(`${origin}${path}`)
  if (before) await before()
  await settle()
  await page.screenshot({ path: `${outDir}/${profile}-${name}.png`, fullPage: true })
  console.log(name)
}

await shot('01-inicio', '/')
await shot('02-mercado', '/mercado')
await shot('03-detalhe', '/nft/emerald-ape-100')
await shot('04-entrar', '/entrar')
await shot('05-criar-conta', '/criar-conta')

// Autentica pela interface para as telas privadas.
await page.goto(`${origin}/entrar`)
await page.waitForFunction(() => Boolean(window.__kurio))
const form = page.getByRole('main')
await form.getByLabel('E-mail').fill('ana@kurio.test')
await form.getByRole('textbox', { name: 'Senha' }).fill('kurio2026')
await form.getByRole('button', { name: 'Entrar', exact: true }).click()
await page.waitForURL((url) => !url.pathname.startsWith('/entrar'), { timeout: 15_000 })
await settle()

await shot('06-carrinho', '/nft/emerald-ape-100', async () => {
  await page.getByRole('button', { name: 'Comprar' }).click()
  await page.waitForTimeout(400)
  await page.goto(`${origin}/carrinho`)
})
await shot('07-pagamento', '/pagamento')
await shot('08-perfil', '/conta/perfil')
await shot('09-carteiras', '/conta/carteiras')
await shot('10-criadores', '/criadores')
await shot('11-aprenda', '/aprenda')

await browser.close()
await server.close()
process.exit(0)
