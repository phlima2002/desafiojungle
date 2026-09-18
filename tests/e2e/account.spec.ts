import { chooseOption, USERS, bootstrap, expect, login, test } from './fixtures'

test.describe('Perfil', () => {
  test('edita os dados e a alteração permanece após refresh', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await page.goto('/conta/perfil')

    const main = page.getByRole('main')
    await main.getByLabel('Nome de exibição').fill('Ana R. Ribeiro')
    await main.getByLabel('Apelido da carteira').fill('Cofre principal')
    await page.getByRole('button', { name: 'Salvar', exact: true }).first().click()
    await expect(main.getByRole('status')).toContainText('Dados salvos')

    await page.reload()
    await expect(main.getByLabel('Nome de exibição')).toHaveValue('Ana R. Ribeiro')
    await expect(main.getByLabel('Apelido da carteira')).toHaveValue('Cofre principal')
  })

  test('erros de validação e conflito aparecem no campo', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await page.goto('/conta/perfil')

    const main = page.getByRole('main')
    await main.getByLabel('Nome de usuário').fill('a')
    await page.getByRole('button', { name: 'Salvar', exact: true }).first().click()
    await expect(page.getByText('Use pelo menos 3 caracteres')).toBeVisible()

    await main.getByLabel('Nome de usuário').fill(USERS.bruno.username)
    await page.getByRole('button', { name: 'Salvar', exact: true }).first().click()
    await expect(page.getByText('Nome de usuário indisponível')).toBeVisible()
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

    await expect(page.getByRole('main').getByRole('status')).toContainText('Avatar atualizado')
    await expect(page.getByRole('img', { name: /Avatar de/ })).toBeVisible()
  })

  test('alteração de senha valida a senha atual', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await page.goto('/conta/perfil')

    const main = page.getByRole('main')
    const savePassword = page.getByRole('button', { name: 'Salvar', exact: true }).last()

    await main.getByLabel('Senha atual').fill('errada')
    await main.getByLabel('Nova senha', { exact: true }).fill('kurio2027')
    await main.getByLabel('Confirmar nova senha').fill('kurio2027')
    await savePassword.click()
    await expect(page.getByText('Senha atual incorreta')).toBeVisible()

    await main.getByLabel('Senha atual').fill(USERS.ana.password)
    await savePassword.click()
    await expect(main.getByRole('status')).toContainText('Senha alterada')
  })
})

test.describe('Carteiras', () => {
  test('lista as carteiras do usuário e conecta/desconecta', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await page.goto('/conta/carteiras')

    const list = page.getByRole('listitem')
    await expect(list.filter({ hasText: 'Carteira principal' })).toHaveCount(1)
    await expect(list.filter({ hasText: 'Reserva Polygon' })).toHaveCount(1)

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

    await page.getByRole('main').getByLabel('Apelido da carteira').fill('Carteira torta')
    await page.getByRole('main').getByLabel('Endereço da carteira').fill('0x123')
    await page.getByRole('button', { name: 'Cadastrar carteira' }).click()
    await expect(page.getByText(/Endereço inválido/)).toBeVisible()
  })

  test('cadastra uma carteira e promove a principal', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await page.goto('/conta/carteiras')

    const main = page.getByRole('main')
    await main.getByLabel('Apelido da carteira').fill('Cofre novo')
    await main.getByLabel('Nome de exibição').fill('Ana Ribeiro')
    await main.getByLabel('Nome do perfil').fill('Ana Ribeiro')
    await main.getByLabel('Endereço da carteira').fill('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')
    await main.getByLabel('Código de indicação').fill('KURIO-NOVO')
    await main.getByLabel('E-mail').fill('ana@kurio.test')
    await main.getByLabel('Nome ENS', { exact: true }).fill('cofrenovo')
    await chooseOption(page, 'Função da carteira', 'Principal')
    await page.getByRole('button', { name: 'Cadastrar carteira' }).click()

    const row = page.getByRole('listitem').filter({ hasText: 'Cofre novo' })
    await expect(row.getByText('Principal', { exact: true })).toBeVisible()

    // Only one primary at a time.
    await expect(
      page.getByRole('listitem').filter({ hasText: 'Carteira principal' }).getByText('Secundária'),
    ).toBeVisible()

    await page.reload()
    await expect(page.getByRole('listitem').filter({ hasText: 'Cofre novo' })).toHaveCount(1)
  })

  test('carteiras não vazam entre usuários', async ({ page }) => {
    await bootstrap(page)
    await login(page, 'ana')
    await page.goto('/conta/carteiras')
    await expect(page.getByRole('listitem').filter({ hasText: 'Carteira principal' })).toHaveCount(1)

    await page.getByRole('button', { name: 'Sair' }).click()
    await login(page, 'bruno')
    await page.goto('/conta/carteiras')

    await expect(page.getByRole('listitem').filter({ hasText: 'Cofre Coinbase' })).toHaveCount(1)
    await expect(page.getByRole('listitem').filter({ hasText: 'Carteira principal' })).toHaveCount(0)
  })
})
