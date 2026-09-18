import { GALLERY_OFFSETS, SHELL_ROOT_ID, artworkForToken, heroImage } from '../../src/app/static-shell'
import { bootstrap, expect, test } from './fixtures'

/**
 * The build-time shell in `src/app/static-shell.ts` duplicates a little markup
 * so that the header and the hero paint before the bundle is parsed. These
 * tests are what keeps the duplicate honest: if the headline, the hero artwork
 * or the header height drift away from the real components, the suite fails
 * instead of the Lighthouse run.
 */
test.describe('Shell estático', () => {
  test('o documento já traz o cabeçalho e o herói antes do JavaScript', async ({ page }) => {
    // No `bootstrap` here: the point is what the HTML contains on its own.
    await page.route('**/assets/*.js', (route) => route.abort())
    await page.goto('/', { waitUntil: 'commit' })

    const shell = page.locator(`#${SHELL_ROOT_ID}`)
    // `getByRole` is out: the shell is `aria-hidden`, so it has no a11y tree.
    await expect(shell.locator('h1')).toHaveText('Seja dono do futuroda arte digital')
    await expect(shell.locator('img')).toHaveAttribute('src', heroImage())
  })

  test('o herói renderizado corresponde ao do shell', async ({ page }) => {
    await bootstrap(page)
    const hero = page.getByRole('main').locator('img').first()
    await expect(hero).toHaveAttribute('src', heroImage())
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Seja dono do futuroda arte digital')
  })

  test('o shell não sobrevive à montagem do React', async ({ page }) => {
    await bootstrap(page)
    await expect(page.locator(`#${SHELL_ROOT_ID}`)).toHaveCount(0)
  })

  test('uma rota profunda não mostra o herói da home', async ({ page }) => {
    await page.route('**/assets/*.js', (route) => route.abort())
    await page.goto('/carrinho', { waitUntil: 'commit' })
    await expect(page.locator('#shell-hero')).toHaveCount(0)
    await expect(page.locator('#shell-detail')).toHaveCount(0)
    await expect(page.locator(`#${SHELL_ROOT_ID}`)).toBeVisible()
  })

  // Two slugs, so the derivation is exercised on two different artworks.
  for (const slug of ['emerald-ape-100', 'neon-signal-114']) {
    test(`a arte de /nft/${slug} vem do documento e bate com a renderizada`, async ({ page }) => {
      const token = Number(slug.split('-').pop())
      const expected = artworkForToken(token)
      expect(expected).toBeTruthy()

      await page.route('**/assets/*.js', (route) => route.abort())
      await page.goto(`/nft/${slug}`, { waitUntil: 'commit' })
      await expect(page.locator('[data-shell-main]')).toHaveAttribute('src', expected!)
      for (const [position, offset] of GALLERY_OFFSETS.entries()) {
        await expect(page.locator(`[data-shell-thumb="${position}"]`)).toHaveAttribute(
          'src',
          artworkForToken(token, offset)!,
        )
      }

      await page.unroute('**/assets/*.js')
      await bootstrap(page)
      await page.goto(`/nft/${slug}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByRole('main').locator('img').nth(GALLERY_OFFSETS.length)).toHaveAttribute(
        'src',
        expected!,
      )
    })
  }

  /**
   * O detalhe é onde isto pega: se a imagem do shell for um pixel menor que a
   * da página, a imagem da página vira um candidato *maior* a LCP e a métrica
   * volta a marcar o segundo desenho — o shell deixa de servir para o que foi
   * feito, sem que nada pareça quebrado.
   */
  test('a arte do shell tem exatamente o tamanho da arte renderizada', async ({ page }) => {
    const width = async () =>
      page.evaluate(() => {
        const img = document.querySelector('#shell [data-shell-main], main article img.aspect-square')
        return img ? Math.round(img.getBoundingClientRect().width) : 0
      })

    await page.route('**/assets/*.js', (route) => route.abort())
    await page.goto('/nft/emerald-ape-100', { waitUntil: 'commit' })
    await expect(page.locator('[data-shell-main]')).toBeVisible()
    const shellWidth = await width()
    expect(shellWidth).toBeGreaterThan(0)

    await page.unroute('**/assets/*.js')
    await bootstrap(page)
    await page.goto('/nft/emerald-ape-100')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(await width()).toBe(shellWidth)
  })

  test('o shell só sai quando o herói tem o que mostrar', async ({ page }) => {
    await bootstrap(page)
    // Once the application is visible the shell is gone, and the hero is an
    // image — never the skeleton the shell was there to avoid.
    await expect(page.locator(`#${SHELL_ROOT_ID}`)).toHaveCount(0)
    await expect(page.getByRole('main').locator('.skeleton')).toHaveCount(0)
  })
})
