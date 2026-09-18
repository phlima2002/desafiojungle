import { SHELL_HERO_IMAGE, SHELL_ROOT_ID } from '../../src/app/static-shell'
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
    await expect(shell.locator('img')).toHaveAttribute('src', SHELL_HERO_IMAGE)
  })

  test('o herói renderizado corresponde ao do shell', async ({ page }) => {
    await bootstrap(page)
    const hero = page.getByRole('main').locator('img').first()
    await expect(hero).toHaveAttribute('src', SHELL_HERO_IMAGE)
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
    await expect(page.locator(`#${SHELL_ROOT_ID}`)).toBeVisible()
  })
})
