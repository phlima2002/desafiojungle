import { useEffect, useId, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Busca do catálogo. O valor mora na URL como todo o resto do estado da
 * listagem — o que é digitado aqui pode ser compartilhado, sobrevive ao refresh
 * e volta no botão de voltar.
 *
 * Duas decisões que valem explicar:
 *
 * 1. O campo tem estado local e só empurra para a URL depois de 300 ms parado.
 *    Navegar a cada tecla encheria o histórico e dispararia uma consulta por
 *    caractere; esperar o formulário ser enviado esconderia resultados de quem
 *    só digita.
 * 2. A navegação usa `replace`, então digitar não deixa dez entradas no
 *    histórico — voltar leva para antes da busca, que é o que se espera.
 */
export function SearchField({
  value,
  onChange,
}: {
  value: string | undefined
  onChange: (next: string | undefined) => void
}) {
  const id = useId()
  const [draft, setDraft] = useState(value ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  // A URL também muda de fora (voltar, um link, "limpar filtros"): quando o
  // valor chega diferente do que está no campo, o campo acompanha. Ajustar o
  // estado durante o render é o padrão do React para isto — um efeito com
  // `setState` renderizaria a tela duas vezes, com um quadro mostrando o texto
  // antigo.
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    setSeen(value)
    if ((value ?? '') !== draft.trim()) setDraft(value ?? '')
  }

  // O callback muda de identidade a cada render do catálogo (ele fecha sobre a
  // busca atual). Guardá-lo numa ref mantém o timer preso ao que foi digitado:
  // sem isso, qualquer re-render do pai — um refetch, por exemplo — reiniciaria
  // os 300 ms e a busca nunca sairia.
  const latest = useRef(onChange)
  useEffect(() => {
    latest.current = onChange
  })

  // O ícone de lupa do cabeçalho aponta para `/mercado#buscar`: quem clicou
  // quer digitar, então além de rolar até aqui o campo recebe o foco.
  useEffect(() => {
    if (window.location.hash === '#buscar') inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const current = value ?? ''
    if (draft.trim() === current) return
    const handle = window.setTimeout(() => latest.current(draft.trim() || undefined), 300)
    return () => window.clearTimeout(handle)
  }, [draft, value])

  return (
    <form
      id="buscar"
      role="search"
      className="relative w-full sm:max-w-sm"
      onSubmit={(event) => {
        event.preventDefault()
        onChange(draft.trim() || undefined)
      }}
    >
      <Label htmlFor={id} className="sr-only">
        Buscar NFTs
      </Label>
      <Search
        aria-hidden
        size={16}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-clay"
      />
      <Input
        id={id}
        ref={inputRef}
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Buscar por nome, criador ou coleção"
        className="h-9 pr-9 pl-9 text-xs"
      />
      {draft ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Limpar busca"
          onClick={() => {
            setDraft('')
            onChange(undefined)
            inputRef.current?.focus()
          }}
          className="absolute top-1/2 right-0 h-9 w-9 -translate-y-1/2 text-sand"
        >
          <X aria-hidden size={14} />
        </Button>
      ) : null}
    </form>
  )
}
