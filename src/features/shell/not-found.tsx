import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-eyebrow tracking-[0.1em] text-accent uppercase">Erro 404</p>
      <h1 className="text-h1 font-bold">Não encontramos esta página</h1>
      <p className="text-sm text-muted">
        O endereço pode ter mudado ou o item saiu do catálogo. Volte ao início para continuar explorando.
      </p>
      <Link
        to="/"
        className="rounded-md bg-primary px-5 py-3 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Voltar ao início
      </Link>
    </section>
  )
}
