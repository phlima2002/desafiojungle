import type { Page } from '@playwright/test'
import { bootstrap, expect, login, test, waitForMocks } from './fixtures'

/**
 * Visual regression over the four screens the challenge calls out. The data is
 * deterministic (seeded fixtures + the `instant` scenario), animations are
 * disabled by the Playwright config, and the fonts are awaited before the
 * capture, so a diff always means the layout actually changed.
 *
 * Baselines are platform-specific: Playwright suffixes them with the OS. Run
 * `npm run test:e2e:update` once on the platform you compare from — CI should
 * use the same one.
 */
async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  // Skeletons must be gone before the capture.
  await expect(page.locator('.skeleton')).toHaveCount(0)
  await page.waitForTimeout(150)
}

test.describe('Regressão visual', () => {
  test('início', async ({ page }) => {
    await bootstrap(page)
    await page.locator('article').first().waitFor()
    await settle(page)
    await expect(page).toHaveScreenshot('inicio.png', { fullPage: true })
  })

  test('detalhes do NFT', async ({ page }) => {
    await bootstrap(page)
    await page.goto('/nft/emerald-ape-100')
    await waitForMocks(page)
    await page.getByRole('heading', { level: 1 }).waitFor()
    await settle(page)
    await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true })
  })

  test('carrinho', async ({ page }) => {
    await bootstrap(page)
    await page.goto('/nft/emerald-ape-100')
    await waitForMocks(page)
    await page.getByRole('button', { name: 'Comprar' }).click()
    await expect(page.getByRole('main').getByRole('status')).toContainText('Adicionado ao carrinho')

    await page.goto('/carrinho')
    await waitForMocks(page)
    await page.getByRole('spinbutton').first().waitFor()
    await settle(page)
    await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true })
  })

  test('pagamento', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await page.goto('/nft/emerald-ape-100')
    await waitForMocks(page)
    await page.getByRole('button', { name: 'Comprar' }).click()
    await expect(page.getByRole('main').getByRole('status')).toContainText('Adicionado ao carrinho')

    await page.goto('/pagamento')
    await waitForMocks(page)
    await page.getByRole('main').getByLabel('Nome de exibição').waitFor()
    await settle(page)
    await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true })
  })
})
