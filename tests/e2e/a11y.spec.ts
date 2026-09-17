import { bootstrap, expect, test } from './fixtures'

test.describe('Acessibilidade e responsividade', () => {
  test('navegação por teclado alcança o conteúdo e mostra o foco', async ({ page }) => {
    await bootstrap(page)

    await page.keyboard.press('Tab')
    const skipLink = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skipLink).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#conteudo/)
  })

  test('não há overflow horizontal em 390, 768 e 1440', async ({ page }) => {
    await bootstrap(page)

    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.waitForTimeout(150)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `largura ${width}px`).toBeLessThanOrEqual(1)
    }
  })

  test('imagens do catálogo têm alternativa textual', async ({ page }) => {
    await bootstrap(page)
    const images = page.locator('article img')
    await images.first().waitFor()
    const count = await images.count()
    expect(count).toBeGreaterThan(0)

    for (let index = 0; index < count; index += 1) {
      await expect(images.nth(index)).toHaveAttribute('alt', /\S/)
    }
  })

  test('um único h1 por página', async ({ page }) => {
    await bootstrap(page)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  })
})
