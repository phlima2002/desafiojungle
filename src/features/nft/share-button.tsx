import { useEffect, useState } from 'react'
import { Check, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Compartilhar o NFT. Usa a folha nativa do sistema quando existe — no celular
 * é o que a pessoa espera — e cai para copiar o endereço quando não existe, que
 * é o caso da maior parte dos navegadores de desktop.
 *
 * O retorno é visível por dois segundos no ícone, e anunciado por uma região
 * `aria-live` que vive *dentro* do botão. Ela fica no documento desde o início
 * (vazia), que é o que faz o leitor de tela anunciar o texto quando ele chega —
 * uma região criada junto com a mensagem costuma passar em branco. Dentro do
 * botão, e não solta na página, porque uma região por instância do componente
 * espalharia `role="status"` vazios por toda a tela.
 */
export function ShareButton({ name, className }: { name: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const handle = window.setTimeout(() => setCopied(false), 2_000)
    return () => window.clearTimeout(handle)
  }, [copied])

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: name, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // Cancelar a folha de compartilhamento ou negar a área de transferência
      // não é erro: não há nada a dizer à pessoa que acabou de desistir.
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      onClick={() => void share()}
      aria-label={`Compartilhar ${name}`}
      className={className ?? 'bg-transparent text-sand hover:border-primary hover:text-accent'}
    >
      {copied ? <Check aria-hidden size={16} className="text-success" /> : <Share2 aria-hidden size={16} />}
      <span aria-live="polite" className="sr-only">
        {copied ? 'Link copiado para a área de transferência.' : ''}
      </span>
    </Button>
  )
}
