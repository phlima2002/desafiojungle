import { bootstrap, expect, login, test, useScenario, waitForMocks } from './fixtures'

async function addFirstAvailableToCart(page: import('@playwright/test').Page) {
  await page.goto('/mercado')
  await page.locator('article h3 a').first().click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const buy = page.getByRole('button', { name: 'Comprar' })
  await expect(buy).toBeEnabled()
  await buy.click()
  await expect(page.getByRole('main').getByRole('status')).toContainText('Adicionado ao carrinho')
}

test.describe('Carrinho', () => {
  test('adiciona, altera quantidade e remove itens', async ({ page }) => {
    await bootstrap(page)
    await addFirstAvailableToCart(page)

    await page.goto('/carrinho')
    const quantity = page.getByRole('spinbutton').first()
    await expect(quantity).toHaveValue('1')

    await quantity.fill('2')
    await quantity.blur()
    await expect(page.getByRole('complementary', { name: 'Resumo da carteira' })).toContainText('Total')

    await page.getByRole('button', { name: /^Remover/ }).click()
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })

  test('carrinho do visitante persiste após refresh', async ({ page }) => {
    await bootstrap(page)
    await addFirstAvailableToCart(page)

    await page.goto('/carrinho')
    await expect(page.getByRole('spinbutton')).toHaveCount(1)

    await page.reload()
    await expect(page.getByRole('spinbutton')).toHaveCount(1)
  })

  test('itens do visitante são preservados ao autenticar', async ({ page }) => {
    await bootstrap(page)
    await addFirstAvailableToCart(page)
    await login(page, 'ana')

    await page.goto('/carrinho')
    await expect(page.getByRole('spinbutton')).toHaveCount(1)
  })

  test('cupom válido aplica desconto e cupom expirado é recusado', async ({ page }) => {
    await bootstrap(page)
    await addFirstAvailableToCart(page)
    await page.goto('/carrinho')

    await page.getByRole('main').getByLabel('Código promocional').fill('KURIO10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('KURIO10 aplicado')).toBeVisible()

    await page.getByRole('button', { name: /^Remover o cupom/ }).click()
    await page.getByRole('main').getByLabel('Código promocional').fill('EXPIRADO')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByRole('alert')).toContainText('Este cupom expirou')
  })

  test('cupom inválido mostra erro associado ao campo', async ({ page }) => {
    await bootstrap(page)
    await addFirstAvailableToCart(page)
    await page.goto('/carrinho')

    await page.getByRole('main').getByLabel('Código promocional').fill('NAOEXISTE')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByRole('main').getByLabel('Código promocional')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await expect(page.getByRole('alert')).toContainText('Cupom não encontrado')
  })

  test('mudança de preço via Socket.IO atualiza o resumo do carrinho', async ({ page }) => {
    await bootstrap(page)
    await addFirstAvailableToCart(page)
    await page.goto('/carrinho')
    await waitForMocks(page)

    const nftId = await page.evaluate(
      () => window.__kurio!.inspect().carts.find((cart) => cart.items.length > 0)!.items[0]!.nftId,
    )
    await page.evaluate((id) => window.__kurio!.setNftPrice(id, '7.77'), nftId)

    await expect(page.getByRole('main').getByRole('status')).toContainText(
      'Algo mudou enquanto seu carrinho estava aberto',
    )
    await expect(page.getByText('7,77 ETH').first()).toBeVisible()
  })

  test('eventos duplicados e antigos não regridem o estado', async ({ page }) => {
    await bootstrap(page, 'duplicate-events')
    await addFirstAvailableToCart(page)
    await page.goto('/carrinho')
    await waitForMocks(page)

    const nftId = await page.evaluate(
      () => window.__kurio!.inspect().carts.find((cart) => cart.items.length > 0)!.items[0]!.nftId,
    )
    await page.evaluate((id) => window.__kurio!.setNftPrice(id, '5.55'), nftId)

    await expect(page.getByText('5,55 ETH').first()).toBeVisible()
    await page.waitForTimeout(500)
    // The duplicate and the stale (older version) event must leave the price as is.
    await expect(page.getByText('5,55 ETH').first()).toBeVisible()
  })
})

test.describe('Favoritos', () => {
  test('favoritar é otimista e volta atrás quando a mutation falha', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await page.goto('/mercado')

    // The quick actions appear on hover, exactly as a collector would reach them.
    const firstCard = page.locator('article').first()
    await firstCard.hover()
    const firstCardHeart = firstCard.getByRole('button', { name: /Favoritar|dos favoritos/ })
    await expect(firstCardHeart).toHaveAttribute('aria-pressed', 'false')
    await firstCardHeart.click()
    await expect(firstCardHeart).toHaveAttribute('aria-pressed', 'true')

    // With the mutation failing, the heart flips optimistically and then
    // returns to its previous state once the server refuses.
    await useScenario(page, 'favorites-fail')
    const secondCard = page.locator('article').nth(1)
    await secondCard.hover()
    const secondCardHeart = secondCard.getByRole('button', { name: /Favoritar|dos favoritos/ })
    await secondCardHeart.click()
    await expect(secondCardHeart).toHaveAttribute('aria-pressed', 'false')
  })

  test('favoritos persistem para o usuário autenticado', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await page.goto('/mercado')

    const card = page.locator('article').first()
    await card.hover()
    const heart = card.getByRole('button', { name: /Favoritar|dos favoritos/ })
    await heart.click()
    await expect(heart).toHaveAttribute('aria-pressed', 'true')

    // The flip above is optimistic — wait for the server to actually hold it
    // before reloading, otherwise the reload would cancel the mutation.
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const response = await fetch('/api/favorites')
          const body = (await response.json()) as { nftIds: string[] }
          return body.nftIds.length
        }),
      )
      .toBeGreaterThan(0)

    await page.reload()
    await page.locator('article').first().hover()
    await expect(
      page
        .locator('article')
        .first()
        .getByRole('button', { name: /Favoritar|dos favoritos/ }),
    ).toHaveAttribute('aria-pressed', 'true')
  })
})
