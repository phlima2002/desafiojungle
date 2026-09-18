import { bootstrap, expect, login, test } from './fixtures'

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
    await login(page, 'ana')

    // Um item no carrinho para que a tabela e o resumo existam de verdade.
    await page.goto('/nft/emerald-ape-100')
    await page.getByRole('button', { name: 'Comprar' }).click()
    await expect(page.getByRole('main').getByRole('status')).toContainText('Adicionado ao carrinho')

    const routes = [
      '/',
      '/mercado',
      '/nft/emerald-ape-100',
      '/carrinho',
      '/pagamento',
      '/conta/perfil',
      '/conta/carteiras',
      '/entrar',
      '/criar-conta',
    ]

    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      for (const route of routes) {
        await page.goto(route)
        await expect(page.locator('.skeleton')).toHaveCount(0)
        // Um guard pode redirecionar logo depois do goto e destruir o contexto
        // de execução no meio da medição; nesse caso a medida é refeita na
        // página em que a navegação parou, que é justamente a que interessa.
        await expect
          .poll(
            () =>
              page
                .evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
                .catch(() => Number.NaN),
            { message: `${route} em ${width}px` },
          )
          .toBeLessThanOrEqual(1)
      }
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

test.describe('Menu mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('drawer prende o foco, fecha com Escape e devolve o foco ao gatilho', async ({ page }) => {
    await bootstrap(page)

    const opener = page.getByRole('button', { name: 'Abrir menu de navegação' })
    await expect(opener).toBeVisible()
    await expect(opener).toHaveAttribute('aria-expanded', 'false')
    await opener.click()

    const dialog = page.getByRole('dialog', { name: 'Menu de navegação' })
    await expect(dialog).toBeVisible()

    // Enquanto o diálogo está aberto o resto da página sai da árvore de
    // acessibilidade — por isso o gatilho é procurado pelo seletor, e não pelo
    // papel: não existir mais para o leitor de tela é o comportamento correto.
    await expect(page.locator('[aria-label="Abrir menu de navegação"]')).toHaveAttribute(
      'aria-expanded',
      'true',
    )

    // The focus lives inside the dialog, never behind it.
    await page.keyboard.press('Tab')
    const focusedInsideDialog = await page.evaluate(() =>
      Boolean(document.activeElement?.closest('[role="dialog"]')),
    )
    expect(focusedInsideDialog).toBe(true)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
    await expect(opener).toHaveAttribute('aria-expanded', 'false')
  })

  test('navegar pelo menu leva à rota e fecha o drawer', async ({ page }) => {
    await bootstrap(page)
    await page.getByRole('button', { name: 'Abrir menu de navegação' }).click()
    await page.getByRole('dialog').getByRole('link', { name: 'Mercado' }).click()

    await expect(page).toHaveURL(/\/mercado/)
    await expect(page.getByRole('dialog')).toBeHidden()
  })
})
