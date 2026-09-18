import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'

const HIGHLIGHTS = [
  {
    initial: 'W',
    title: 'Segurança da carteira',
    body: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    initial: 'C',
    title: 'Criadores em destaque',
    body: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    initial: 'D',
    title: 'Alertas de lançamentos',
    body: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
] as const

const LINK_COLUMNS = [
  {
    title: 'Meu perfil',
    links: ['Meu perfil', 'Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse'],
  },
  {
    title: 'Central de ajuda',
    links: [
      'Central de ajuda',
      'Como comprar NFTs',
      'Carteira e segurança',
      'Política do mercado',
      'Denunciar item',
    ],
  },
  {
    title: 'Coleções',
    links: ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade'],
  },
] as const

/**
 * The layout shows the platforms' logos. Reproducing third-party brand marks is
 * not something this project should ship, so each link carries a neutral
 * lettermark plus an accessible name — documented in docs/assets.md.
 */
const SOCIALS = [
  { label: 'Facebook', short: 'f' },
  { label: 'Instagram', short: 'ig' },
  { label: 'X', short: 'x' },
  { label: 'LinkedIn', short: 'in' },
  { label: 'YouTube', short: 'yt' },
] as const

export function SiteFooter() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  // Out of scope for the challenge: the form validates and acknowledges, but it
  // deliberately does not pretend a subscription was created.
  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubscribed(true)
  }

  return (
    <footer className="mt-24 hidden md:block">
      <div className="mx-auto max-w-page px-4 sm:px-8">
        <div className="grid gap-8 rounded-md border border-line bg-card/60 p-6 lg:grid-cols-[1fr_1fr_1fr_minmax(0,1.1fr)] lg:p-8">
          {HIGHLIGHTS.map((highlight, index) => (
            <section
              key={highlight.initial}
              className={index > 0 ? 'lg:border-l lg:border-line lg:pl-8' : undefined}
            >
              <span
                aria-hidden
                className="grid size-12 place-items-center rounded-pill bg-primary text-h4 font-bold text-primary-foreground"
              >
                {highlight.initial}
              </span>
              <h2 className="mt-4 text-md font-bold">{highlight.title}</h2>
              <p className="mt-2 text-xs text-muted">{highlight.body}</p>
            </section>
          ))}

          <section className="lg:border-l lg:border-line lg:pl-8">
            <h2 className="text-lg font-bold">Antecipe-se ao próximo lançamento</h2>
            <form onSubmit={onSubmit} className="mt-4 flex gap-2">
              <label htmlFor="newsletter" className="sr-only">
                Seu e-mail
              </label>
              <input
                id="newsletter"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="digite seu e-mail..."
                className="min-w-0 flex-1 rounded-sm border border-line bg-card-raised px-3 py-2 text-xs placeholder:text-clay"
              />
              <Button type="submit" size="sm" className="h-auto py-2">
                Enviar
              </Button>
            </form>
            <p aria-live="polite" className="mt-3 min-h-[2.75rem] text-2xs text-muted">
              {subscribed
                ? 'A newsletter está fora do escopo desta entrega — nada foi enviado.'
                : 'Receba lançamentos selecionados, histórias de criadores e novidades do mercado.'}
            </p>
          </section>
        </div>
      </div>

      <div className="mt-10 border-y border-line bg-primary/10">
        <div className="mx-auto flex max-w-page flex-wrap items-center gap-x-10 gap-y-3 px-4 py-5 text-xs sm:px-8">
          <span className="font-bold tracking-[0.1em]">KURIO</span>
          <span className="text-muted">Feito para colecionadores, criadores e cultura</span>
          <span className="text-muted">contato@email.com</span>
          <span className="text-muted">+55 11 4002 8922</span>
        </div>
      </div>

      <div className="mx-auto grid max-w-page gap-10 px-4 py-12 sm:px-8 md:grid-cols-2 lg:grid-cols-4">
        {LINK_COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-lg font-bold">{column.title}</h2>
            <ul className="mt-4 space-y-2">
              {column.links.map((link) => (
                <li key={link} className="text-xs text-muted">
                  {link}
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <h2 className="text-lg font-bold">Redes sociais</h2>
          <ul className="mt-4 flex gap-2">
            {SOCIALS.map(({ label, short }) => (
              <li key={label}>
                <span
                  aria-label={label}
                  role="img"
                  className="grid size-8 place-items-center rounded-xs bg-card-raised text-3xs font-bold text-sand lowercase"
                >
                  {short}
                </span>
              </li>
            ))}
          </ul>

          <h2 className="mt-8 text-lg font-bold">Carteiras compatíveis</h2>
          <p className="mt-3 inline-block rounded-xs border border-primary/40 bg-primary/10 px-3 py-2 text-eyebrow font-bold tracking-[0.1em] text-accent">
            METAMASK &nbsp;•&nbsp; WALLETCONNECT &nbsp;•&nbsp; COINBASE
          </p>
        </div>
      </div>

      <div className="border-t border-line">
        <p className="mx-auto max-w-page px-4 py-6 text-center text-3xs text-subtle sm:px-8">
          © 2026 Kurio. Propriedade digital para todos. Projeto de demonstração — dados, carteiras e
          pagamentos são simulados.
        </p>
      </div>
    </footer>
  )
}
