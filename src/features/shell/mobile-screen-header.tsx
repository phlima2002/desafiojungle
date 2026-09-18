import { useRouter } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

/**
 * Topo das telas internas no celular, como o Figma desenha: um botão circular
 * de voltar e o título centralizado. Some a partir de `md`, onde o cabeçalho do
 * site e a trilha de navegação assumem.
 *
 * O botão usa o histórico do roteador em vez de apontar para uma rota fixa:
 * chega-se ao carrinho do catálogo, de um detalhe ou do pagamento, e voltar
 * para onde se estava é o que o gesto promete. Sem histórico — alguém que abriu
 * o link direto —, ele leva ao início, que é o destino que nunca engana.
 */
export function MobileBackButton({ className }: { className?: string }) {
  const router = useRouter()

  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => {
        if (router.history.canGoBack()) router.history.back()
        else void router.navigate({ to: '/' })
      }}
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-pill bg-card text-foreground transition-colors hover:text-accent',
        className,
      )}
    >
      <ChevronLeft aria-hidden size={20} />
    </button>
  )
}

export function MobileScreenHeader({ title }: { title: string }) {
  return (
    <div className="mb-6 flex items-center gap-3 md:hidden">
      <MobileBackButton />
      {/* O título visível é o desta tela; o `h1` de cada página continua onde
          está, então aqui ele não repete nível de cabeçalho. */}
      <p className="min-w-0 flex-1 truncate pr-11 text-center text-h4 font-bold">{title}</p>
    </div>
  )
}
