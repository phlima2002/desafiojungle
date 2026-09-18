import type { Page } from '@playwright/test'
import { bootstrap, expect, login, test, waitForMocks } from './fixtures'

async function addItem(page: Page) {
  await page.goto('/mercado')
  await page.locator('article h3 a').first().click()
  const buy = page.getByRole('button', { name: 'Comprar' })
  await expect(buy).toBeEnabled()
  await buy.click()
  await expect(page.getByRole('main').getByRole('status')).toContainText('Adicionado ao carrinho')
}

test.describe('Tempo real', () => {
  test('o socket conecta e o catálogo reage a nft.updated', async ({ page }) => {
    await bootstrap(page)
    await expect.poll(() => page.evaluate(() => window.__kurio!.realtime.connectionCount())).toBe(1)

    const price = page.locator('article').first().locator('p span').first()
    const before = await price.textContent()

    const nftId = await page.evaluate(async () => {
      const response = await fetch('/api/nfts?page=1&pageSize=9&sort=recent&tab=all')
      const body = (await response.json()) as { items: Array<{ id: string }> }
      return body.items[0]!.id
    })
    await page.evaluate((id) => window.__kurio!.setNftPrice(id, '3.21'), nftId)

    await expect(price).toHaveText('3,21 ETH')
    expect(before).not.toBe('3,21 ETH')
  })

  test('o detalhe reflete a mudança de disponibilidade sem recarregar', async ({ page }) => {
    await bootstrap(page)
    await page.locator('article h3 a').first().click()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const { nftId, editionId } = await page.evaluate(async () => {
      const slug = window.location.pathname.split('/').pop()!
      const response = await fetch(`/api/nfts/${slug}`)
      const nft = (await response.json()) as { id: string; editions: Array<{ id: string }> }
      return { nftId: nft.id, editionId: nft.editions[0]!.id }
    })

    await page.evaluate(
      ({ nftId: id, editionId: edition }) => window.__kurio!.setEditionAvailability(id, edition, 0),
      { nftId, editionId },
    )

    await expect(page.getByText('esgotada').first()).toBeVisible()
  })

  test('queda de conexão e retomada não criam um segundo pedido', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await addItem(page)

    await page.goto('/pagamento')
    await waitForMocks(page)
    const main = page.getByRole('main')
    await main.getByLabel('Nome de exibição').fill('Ana Ribeiro')
    await main.getByLabel('Nome de usuário').fill('anaribeiro')
    await main.getByLabel('Nome do perfil').fill('Ana Ribeiro')
    await main.getByLabel('Endereço da carteira').fill('0x8f2c41b3d5a76e90c1428b7fd3a51e60947ac2db')
    await main.getByLabel('Código de indicação').fill('KURIO-ANA1')
    await main.getByLabel('E-mail').fill('ana@kurio.test')
    await main.getByLabel('Nome ENS', { exact: true }).fill('anaribeiro')

    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page).toHaveURL(/\/pedido\//)

    // The connection drops right after the order is placed.
    await page.evaluate(() => window.__kurio!.realtime.disconnectAll())
    await page.reload()
    await waitForMocks(page)

    // The receipt recovers from REST, and the server still holds one order.
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /Seus NFTs agora estão na sua carteira|Estamos confirmando sua compra/,
    )
    await expect.poll(() => page.evaluate(() => window.__kurio!.inspect().orders.length)).toBe(1)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Seus NFTs agora estão na sua carteira',
    )
  })

  test('reconexão reconcilia o catálogo com o REST', async ({ page }) => {
    await bootstrap(page)
    await expect.poll(() => page.evaluate(() => window.__kurio!.realtime.connectionCount())).toBe(1)

    const nftId = await page.evaluate(async () => {
      const response = await fetch('/api/nfts?page=1&pageSize=9&sort=recent&tab=all')
      const body = (await response.json()) as { items: Array<{ id: string }> }
      return body.items[0]!.id
    })

    // While offline the event is lost; reconnecting must reconcile via REST.
    await page.evaluate(() => window.__kurio!.realtime.disconnectAll())
    await page.evaluate((id) => window.__kurio!.setNftPrice(id, '4.56'), nftId)

    await expect(page.locator('article').first().locator('p span').first()).toHaveText('4,56 ETH', {
      timeout: 20_000,
    })
  })

  test('listeners são liberados ao sair da conta', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await expect.poll(() => page.evaluate(() => window.__kurio!.realtime.connectionCount())).toBe(1)

    await page.goto('/conta/perfil')
    await page.getByRole('button', { name: 'Sair' }).click()

    // The previous session's socket is torn down and a fresh one replaces it —
    // never two connections carrying two identities.
    await expect
      .poll(() => page.evaluate(() => window.__kurio!.realtime.connectionCount()), { timeout: 15_000 })
      .toBeLessThanOrEqual(1)
  })
})
