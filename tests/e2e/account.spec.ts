import { USERS, bootstrap, expect, login, test } from './fixtures'

test.describe('Perfil', () => {
  test('edita os dados e a alteração permanece após refresh', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await page.goto('/conta/perfil')

    await page.getByLabel('Nome', { exact: true }).fill('Ana R. Ribeiro')
    await page.getByLabel('Localização').fill('Olinda, BR')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByRole('status')).toContainText('Dados salvos')

    await page.reload()
    await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Ana R. Ribeiro')
    await expect(page.getByLabel('Localização')).toHaveValue('Olinda, BR')
  })

  test('erros de validação e conflito aparecem no campo', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await page.goto('/conta/perfil')

    await page.getByLabel('Nome de exibição').fill('a')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText('Use pelo menos 3 caracteres')).toBeVisible()

    await page.getByLabel('Nome de exibição').fill(USERS.bruno.displayName)
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText('Nome de exibição indisponível')).toBeVisible()
  })

  test('avatar é enviado e renderizado', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await page.goto('/conta/perfil')

    // 1×1 PNG.
    await page.setInputFiles('#avatar', {
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
    })

    await expect(page.getByRole('status')).toContainText('Avatar atualizado')
    await expect(page.getByRole('img', { name: /Avatar de/ })).toBeVisible()
  })

  test('alteração de senha valida a senha atual', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await page.goto('/conta/perfil')

    await page.getByLabel('Senha atual').fill('errada')
    await page.getByLabel('Nova senha', { exact: true }).fill('kurio2027')
    await page.getByLabel('Confirmar nova senha').fill('kurio2027')
    await page.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(page.getByText('Senha atual incorreta')).toBeVisible()

    await page.getByLabel('Senha atual').fill(USERS.ana.password)
    await page.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(page.getByRole('status')).toContainText('Senha alterada')
  })
})

test.describe('Carteiras', () => {
  test('lista as carteiras do usuário e conecta/desconecta', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await page.goto('/conta/carteiras')

    await expect(page.getByText('Carteira principal')).toBeVisible()
    await expect(page.getByText('Reserva Polygon')).toBeVisible()

    const reserve = page.getByRole('listitem').filter({ hasText: 'Reserva Polygon' })
    await reserve.getByRole('button', { name: 'Conectar' }).click()
    await expect(reserve.getByText('Conectada')).toBeVisible()

    await reserve.getByRole('button', { name: 'Desconectar' }).click()
    await expect(reserve.getByText('Desconectada')).toBeVisible()
  })

  test('endereço inválido é recusado antes da API', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await page.goto('/conta/carteiras')

    await page.getByLabel('Apelido').fill('Carteira torta')
    await page.getByLabel('Endereço').fill('0x123')
    await page.getByRole('button', { name: 'Cadastrar carteira' }).click()
    await expect(page.getByText(/Endereço inválido/)).toBeVisible()
  })

  test('cadastra uma carteira e promove a principal', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await page.goto('/conta/carteiras')

    await page.getByLabel('Apelido').fill('Cofre novo')
    await page.getByLabel('Endereço').fill('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')
    await page.getByLabel('Função').selectOption('primary')
    await page.getByRole('button', { name: 'Cadastrar carteira' }).click()

    const row = page.getByRole('listitem').filter({ hasText: 'Cofre novo' })
    await expect(row.getByText('Principal')).toBeVisible()

    // Only one primary at a time.
    await expect(
      page.getByRole('listitem').filter({ hasText: 'Carteira principal' }).getByText('Secundária'),
    ).toBeVisible()

    await page.reload()
    await expect(page.getByText('Cofre novo')).toBeVisible()
  })

  test('carteiras não vazam entre usuários', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await page.goto('/conta/carteiras')
    await expect(page.getByText('Carteira principal')).toBeVisible()

    await page.getByRole('button', { name: 'Sair' }).click()
    await login(page, 'bruno')
    await page.goto('/conta/carteiras')

    await expect(page.getByText('Cofre Coinbase')).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: 'Carteira principal' })).toHaveCount(0)
  })
})
