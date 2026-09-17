import { USERS, bootstrap, expect, login, test, useScenario } from './fixtures'

test.describe('Conta e sessão', () => {
  test('cadastro cria a conta e autentica', async ({ page }) => {
    await bootstrap(page)
    await page.goto('/criar-conta')

    await page.getByLabel('Nome').fill('Clara Vidal')
    await page.getByLabel('E-mail').fill('clara@kurio.test')
    await page.getByLabel('Senha', { exact: true }).fill('kurio2026')
    await page.getByLabel('Confirmar senha').fill('kurio2026')
    await page.getByRole('button', { name: 'Criar conta' }).click()

    await expect(page.getByRole('link', { name: 'clara' })).toBeVisible()
  })

  test('cadastro com e-mail já usado mostra o conflito no campo', async ({ page }) => {
    await bootstrap(page)
    await page.goto('/criar-conta')

    await page.getByLabel('Nome').fill('Ana Duplicada')
    await page.getByLabel('E-mail').fill(USERS.ana.email)
    await page.getByLabel('Senha', { exact: true }).fill('kurio2026')
    await page.getByLabel('Confirmar senha').fill('kurio2026')
    await page.getByRole('button', { name: 'Criar conta' }).click()

    await expect(page.getByText('E-mail já cadastrado')).toBeVisible()
    await expect(page.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true')
  })

  test('validação do formulário acontece antes de chamar a API', async ({ page }) => {
    await bootstrap(page)
    await page.goto('/criar-conta')

    await page.getByLabel('E-mail').fill('não-é-email')
    await page.getByLabel('Senha', { exact: true }).fill('123')
    await page.getByRole('button', { name: 'Criar conta' }).click()

    await expect(page.getByText('Informe um e-mail válido')).toBeVisible()
    await expect(page.getByText('Use pelo menos 8 caracteres')).toBeVisible()
  })

  test('login inválido mostra a mensagem da API', async ({ page }) => {
    await bootstrap(page)
    await page.goto('/entrar')
    await page.getByLabel('E-mail').fill(USERS.ana.email)
    await page.getByLabel('Senha', { exact: true }).fill('senha-errada')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos')
  })

  test('sessão sobrevive a refresh', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await page.reload()
    await expect(page.getByRole('link', { name: USERS.ana.displayName })).toBeVisible()
  })

  test('rota privada redireciona para o login preservando o destino', async ({ page }) => {
    await bootstrap(page)
    await page.goto('/conta/perfil')
    await expect(page).toHaveURL(/\/entrar\?redirect=/)
    await expect(page).toHaveURL(/conta%2Fperfil|conta\/perfil/)
  })

  test('expiração durante a navegação leva de volta ao login', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')

    await useScenario(page, 'session-expired')
    await page.goto('/conta/carteiras')
    await expect(page).toHaveURL(/\/entrar/)
  })

  test('troca de usuário não vaza dados privados em cache', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await page.goto('/conta/perfil')
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()

    await login(page, 'bruno')
    await expect(page.getByRole('link', { name: USERS.bruno.displayName })).toBeVisible()
    await expect(page.getByRole('link', { name: USERS.ana.displayName })).toHaveCount(0)
  })
})
