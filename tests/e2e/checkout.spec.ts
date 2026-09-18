import type { Page } from '@playwright/test'
import { bootstrap, expect, login, test, useScenario, waitForMocks } from './fixtures'

async function addItemAndGoToCheckout(page: Page) {
  await page.goto('/mercado')
  await page.locator('article h3 a').first().click()
  const buy = page.getByRole('button', { name: 'Comprar' })
  await expect(buy).toBeEnabled()
  await buy.click()
  await expect(page.getByRole('main').getByRole('status')).toContainText('Adicionado ao carrinho')
  await page.goto('/pagamento')
  await waitForMocks(page)
}

/**
 * The checkout profile mirrors the layout's field set. The wallet already fills
 * most of it, so the helper only completes what the seed leaves blank.
 */
async function fillCollector(page: Page) {
  const main = page.getByRole('main')
  await main.getByLabel('Nome de exibição').fill('Ana Ribeiro')
  await main.getByLabel('Nome de usuário').fill('anaribeiro')
  await main.getByLabel('Nome do perfil').fill('Ana Ribeiro')
  await main.getByLabel('Endereço da carteira').fill('0x8f2c41b3d5a76e90c1428b7fd3a51e60947ac2db')
  await main.getByLabel('Código de indicação').fill('KURIO-ANA1')
  await main.getByLabel('E-mail').fill('ana@kurio.test')
  await main.getByLabel('Nome ENS', { exact: true }).fill('anaribeiro')
}

test.describe('Compra', () => {
  test('fluxo completo do catálogo ao recibo confirmado', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await addItemAndGoToCheckout(page)

    await fillCollector(page)
    const walletGroup = page.getByRole('group', { name: 'Carteira e rede' })
    await expect(walletGroup.getByText('Conectada').first()).toBeVisible()

    await page.getByRole('button', { name: 'Confirmar compra' }).click()

    await expect(page).toHaveURL(/\/pedido\//)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Seus NFTs agora estão na sua carteira',
    )
    await expect(page.getByText('ID da transação')).toBeVisible()

    // Only the purchased line leaves the cart.
    await page.goto('/carrinho')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })

  test('pagamento recusado mostra o motivo e é terminal', async ({ page }) => {
    await bootstrap(page, 'payment-declined')
    await login(page, 'ana')
    await addItemAndGoToCheckout(page)
    await fillCollector(page)

    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page).toHaveURL(/\/pedido\//)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Não foi possível concluir a compra')
    await expect(page.getByRole('alert')).toContainText('recusou a assinatura')

    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Não foi possível concluir a compra')
  })

  test('cliques repetidos não criam um segundo pedido', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await addItemAndGoToCheckout(page)
    await fillCollector(page)

    // Three clicks in the same tick: the second and third must be swallowed.
    await page.evaluate(() => {
      const button = document.querySelector<HTMLButtonElement>('button[type="submit"]')
      button?.click()
      button?.click()
      button?.click()
    })

    await expect(page).toHaveURL(/\/pedido\//)
    const orders = await page.evaluate(() => window.__kurio!.inspect().orders)
    expect(orders).toHaveLength(1)
  })

  test('timeout após criar o pedido é recuperado pela chave de idempotência', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await addItemAndGoToCheckout(page)
    await fillCollector(page)

    // The order is created on the server, but the answer never arrives.
    await useScenario(page, 'order-timeout')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByRole('button', { name: 'Enviando pedido…' })).toBeVisible()

    await page.waitForTimeout(1500)
    const afterTimeout = await page.evaluate(() => window.__kurio!.inspect().orders)
    expect(afterTimeout).toHaveLength(1)

    // Coming back replays the same key automatically: the server answers with
    // the order that already exists instead of creating a second one.
    await useScenario(page, 'instant')
    await page.goto('/pagamento')
    await waitForMocks(page)

    await expect(page).toHaveURL(/\/pedido\//, { timeout: 20_000 })
    const finalOrders = await page.evaluate(() => window.__kurio!.inspect().orders)
    expect(finalOrders).toHaveLength(1)
    expect(finalOrders[0]!.id).toBe(afterTimeout[0]!.id)
  })

  test('preço alterado durante o checkout exige nova confirmação', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await addItemAndGoToCheckout(page)
    await fillCollector(page)

    const nftId = await page.evaluate(
      () => window.__kurio!.inspect().carts.find((cart) => cart.userId)!.items[0]!.nftId,
    )
    await page.evaluate((id) => window.__kurio!.setNftPrice(id, '9.87'), nftId)

    // The quote is re-issued and reports the change; confirming is blocked
    // until the collector reviews it.
    await expect(page.getByRole('main').getByRole('status')).toContainText('Confira o que mudou')
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()

    await page.getByRole('button', { name: 'Revisar e recalcular' }).click()
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()

    // Confirming now uses the new price, and the receipt reflects it.
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page).toHaveURL(/\/pedido\//)
    await expect(page.getByText('9,87 ETH').first()).toBeVisible()
  })

  test('carteira que recusa a conexão bloqueia a confirmação', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')

    // A Ledger wallet always refuses in the simulation.
    await page.goto('/conta/carteiras')
    const main = page.getByRole('main')
    await main.getByLabel('Apelido da carteira').fill('Ledger de teste')
    await main.getByLabel('Nome de exibição').fill('Ana Ribeiro')
    await main.getByLabel('Nome do perfil').fill('Ana Ribeiro')
    await main.getByLabel('Tipo de carteira').selectOption('ledger')
    await main.getByLabel('Rede', { exact: true }).selectOption('ethereum')
    await main.getByLabel('Endereço da carteira').fill('0x1111111111111111111111111111111111111111')
    await main.getByLabel('Código de indicação').fill('KURIO-TEST')
    await main.getByLabel('E-mail').fill('ana@kurio.test')
    await main.getByLabel('Nome ENS', { exact: true }).fill('anatest')
    await main.getByLabel('Função da carteira').selectOption('secondary')
    await page.getByRole('button', { name: 'Cadastrar carteira' }).click()

    const row = page.getByRole('listitem').filter({ hasText: 'Ledger de teste' })
    await row.getByRole('button', { name: 'Conectar' }).click()
    await expect(page.getByRole('alert')).toContainText('recusou a conexão')
  })
})
