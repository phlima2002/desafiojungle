/**
 * Account screens are scheduled for the next milestone. Their contracts,
 * endpoints and mock handlers (profile, avatar, password, wallets) are already
 * implemented and exercised by the mock server.
 */
export function AccountStub({ title, description }: { title: string; description: string }) {
  return (
    <section>
      <h1 className="text-h1 font-bold">{title}</h1>
      <p className="mt-2 text-xs text-muted">{description}</p>
      <p className="mt-6 rounded-md border border-line bg-card p-5 text-xs text-muted">
        Em construção — os contratos e handlers desta tela já existem na camada de mocks.
      </p>
    </section>
  )
}
