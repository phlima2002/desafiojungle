import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { bootstrap, expect, login, test } from './fixtures'

/**
 * Transições em curso fazem o axe amostrar uma cor intermediária e acusar
 * contraste onde não há — o resultado depende do instante em que ele roda.
 * Congelar animação e transição torna a medição determinística; é a mesma
 * higiene que a regressão visual usa.
 */
async function audit(page: Page) {
  await page.addStyleTag({
    content: '*, *::before, *::after { transition: none !important; animation: none !important }',
  })
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  return violations.map((violation) => `${violation.id}: ${violation.nodes[0]?.target.join(' ')}`)
}

/**
 * O Lighthouse audita duas páginas; o desafio tem nove. Aqui o axe passa por
 * todas elas, autenticado e com item no carrinho, nos dois viewports — é o que
 * garante que a meta de acessibilidade não vale só para as telas medidas.
 *
 * As regras são as WCAG 2 A/AA, que é o conjunto em que o Lighthouse se baseia.
 */
const ROUTES = [
  ['início', '/'],
  ['mercado', '/mercado'],
  ['detalhe do NFT', '/nft/emerald-ape-100'],
  ['carrinho', '/carrinho'],
  ['pagamento', '/pagamento'],
  ['perfil', '/conta/perfil'],
  ['carteiras', '/conta/carteiras'],
] as const

test.describe('Acessibilidade (axe)', () => {
  test('nenhuma violação WCAG 2 A/AA nas telas do desafio', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')

    await page.goto('/nft/emerald-ape-100')
    await page.getByRole('button', { name: 'Comprar' }).click()
    await expect(page.getByRole('main').getByRole('status')).toContainText('Adicionado ao carrinho')

    for (const [name, route] of ROUTES) {
      await page.goto(route)
      await expect(page.locator('.skeleton')).toHaveCount(0)

      expect(await audit(page), `violações em ${name} (${route})`).toEqual([])
    }
  })

  test('nenhuma violação nas telas de entrada', async ({ page }) => {
    await bootstrap(page)

    for (const route of ['/entrar', '/criar-conta']) {
      await page.goto(route)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

      expect(await audit(page), `violações em ${route}`).toEqual([])
    }
  })

  test('nenhuma violação com a gaveta de navegação aberta', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await bootstrap(page)
    await page.getByRole('button', { name: 'Abrir menu de navegação' }).click()
    await expect(page.getByRole('dialog', { name: 'Menu de navegação' })).toBeVisible()

    expect(await audit(page)).toEqual([])
  })
})
