import { bootstrap, expect, test, useScenario } from './fixtures'

test.describe('Catálogo', () => {
  test('busca, filtros combinados, ordenação e paginação compõem a URL e sobrevivem a refresh', async ({
    page,
  }) => {
    await bootstrap(page)

    await page.getByRole('tab', { name: 'Em alta' }).click()
    await page.getByRole('button', { name: /^Arte digital/ }).click()
    await page.getByRole('button', { name: /^Ethereum/ }).click()
    await page.getByRole('main').getByLabel('Ordenar por:').selectOption('price-asc')

    await expect(page).toHaveURL(/tab=trending/)
    await expect(page).toHaveURL(/categoria=arte-digital/)
    await expect(page).toHaveURL(/rede=ethereum/)
    await expect(page).toHaveURL(/ordenar=price-asc/)

    const urlWithFilters = page.url()
    await page.reload()
    await expect(page).toHaveURL(urlWithFilters)
    await expect(page.getByRole('tab', { name: 'Em alta' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('button', { name: /^Arte digital/ })).toHaveAttribute('aria-pressed', 'true')
  })

  test('mudança de filtro reinicia a paginação', async ({ page }) => {
    await bootstrap(page)

    const page3 = page.getByRole('button', { name: '3', exact: true })
    if (await page3.isVisible()) {
      await page3.click()
      await expect(page).toHaveURL(/pagina=3/)
      await page.getByRole('button', { name: /^Fotografia/ }).click()
      await expect(page).not.toHaveURL(/pagina=/)
    }
  })

  test('histórico do navegador restaura o estado anterior', async ({ page }) => {
    await bootstrap(page)

    await page.getByRole('button', { name: /^Música/ }).click()
    await expect(page).toHaveURL(/categoria=musica/)

    await page.goBack()
    await expect(page).not.toHaveURL(/categoria=musica/)
    await expect(page.getByRole('button', { name: /^Música/ })).toHaveAttribute('aria-pressed', 'false')

    await page.goForward()
    await expect(page).toHaveURL(/categoria=musica/)
  })

  test('resultado vazio é tratado com uma saída clara', async ({ page }) => {
    await bootstrap(page, 'empty-results')
    await expect(page.getByText('Nenhum NFT encontrado')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Limpar filtros' })).toBeVisible()
  })

  test('falha do catálogo mostra erro e se recupera ao tentar de novo', async ({ page }) => {
    await bootstrap(page)
    await page.goto('/mercado?scenario=server-error')

    const alert = page.getByRole('alert')
    await expect(alert).toContainText('Não foi possível carregar o catálogo')

    await useScenario(page, 'instant')
    await page.getByRole('button', { name: 'Tentar de novo' }).click()
    await expect(page.locator('article').first()).toBeVisible()
  })

  test('skeletons aparecem enquanto a rede está lenta', async ({ page }) => {
    await bootstrap(page)
    await page.goto('/mercado?scenario=slow-network')
    await expect(page.locator('.skeleton').first()).toBeVisible()
    await expect(page.locator('article').first()).toBeVisible({ timeout: 20_000 })
  })
})

test.describe('Detalhe do NFT', () => {
  test('acesso direto por URL funciona', async ({ page }) => {
    await bootstrap(page)
    const firstCard = page.locator('article h3 a').first()
    const href = await firstCard.getAttribute('href')
    expect(href).toBeTruthy()

    await page.goto(href!)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: /Comprar|esgotada/ })).toBeVisible()
  })

  test('NFT inexistente cai no 404', async ({ page }) => {
    await bootstrap(page)
    await page.goto('/nft/nao-existe-mesmo')
    await expect(page.getByText('Não encontramos esta página')).toBeVisible()
  })

  test('rota inexistente cai no 404', async ({ page }) => {
    await bootstrap(page)
    await page.goto('/rota/que/nao/existe')
    await expect(page.getByText('Não encontramos esta página')).toBeVisible()
  })
})
