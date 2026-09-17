const COLUMNS = [
  { title: 'Kurio', links: ['Sobre', 'Carreiras', 'Imprensa', 'Contato'] },
  { title: 'Colecionar', links: ['Mercado', 'Criadores', 'Coleções', 'Lançamentos'] },
  { title: 'Ajuda', links: ['Central de ajuda', 'Como comprar NFTs', 'Carteiras', 'Segurança'] },
] as const

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-card/40">
      <div className="mx-auto grid max-w-page gap-10 px-4 py-12 sm:px-8 md:grid-cols-4">
        <div className="space-y-3">
          <p className="text-xs font-bold tracking-[0.1em]">KURIO</p>
          <p className="text-3xs text-muted">
            Marketplace de arte digital com curadoria. Colecione, apoie artistas e acompanhe cada edição.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title} className="space-y-3">
            <h2 className="text-xs font-bold text-foreground">{column.title}</h2>
            <ul className="space-y-2">
              {column.links.map((link) => (
                <li key={link}>
                  <span className="text-3xs text-muted">{link}</span>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-page px-4 py-6 text-3xs text-subtle sm:px-8">
          © 2026 Kurio. Projeto de demonstração — dados, carteiras e pagamentos são simulados.
        </p>
      </div>
    </footer>
  )
}
