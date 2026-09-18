import { useState } from 'react'
import { formatEth } from '@/shared/lib/money'
import { Button } from '@/components/ui/button'

interface PriceRangeFilterProps {
  bounds: { min: string; max: string }
  value: { min?: string; max?: string }
  onApply: (next: { min?: string; max?: string }) => void
}

const STEP = 0.01

/**
 * A faixa de preço do layout: uma trilha só, com dois polegares, e o trecho
 * escolhido pintado entre eles.
 *
 * Por baixo continuam dois `input[type=range]` de verdade, sobrepostos na mesma
 * linha — cada polegar é um slider com rótulo próprio, operável pelo teclado e
 * anunciado como slider. Um controle desenhado com `div` teria de reimplementar
 * tudo isso, em geral pela metade. O que o CSS faz (ver `.range-thumb`) é só
 * esconder a trilha nativa: a trilha visível é a que este componente desenha.
 */
export function PriceRangeFilter({ bounds, value, onApply }: PriceRangeFilterProps) {
  const floor = Number(bounds.min)
  const ceiling = Number(bounds.max)

  // Initialised from the URL. The caller re-mounts this component (via `key`)
  // whenever the URL changes elsewhere — back/forward, "limpar filtros", a
  // shared link — which is React's own way of resetting state from props.
  const [min, setMin] = useState(() => Number(value.min ?? bounds.min))
  const [max, setMax] = useState(() => Number(value.max ?? bounds.max))

  const span = Math.max(ceiling - floor, STEP)
  const percent = (amount: number) => ((amount - floor) / span) * 100

  const apply = () => {
    onApply({
      min: min > floor ? min.toFixed(2) : undefined,
      max: max < ceiling ? max.toFixed(2) : undefined,
    })
  }

  return (
    <fieldset className="rounded-2xl bg-card p-5 md:rounded-md">
      <legend className="mb-4 text-lg font-bold">Faixa de preço</legend>

      <div className="relative h-6">
        <span
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-pill bg-line-strong"
        />
        <span
          aria-hidden
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-pill bg-primary"
          style={{ left: `${percent(min)}%`, right: `${100 - percent(max)}%` }}
        />

        <label>
          <span className="sr-only">Preço mínimo em ETH</span>
          <input
            type="range"
            min={floor}
            max={ceiling}
            step={STEP}
            value={min}
            onChange={(event) => setMin(Math.min(Number(event.target.value), max))}
            className="range-thumb"
          />
        </label>
        <label>
          <span className="sr-only">Preço máximo em ETH</span>
          <input
            type="range"
            min={floor}
            max={ceiling}
            step={STEP}
            value={max}
            onChange={(event) => setMax(Math.max(Number(event.target.value), min))}
            className="range-thumb"
          />
        </label>
      </div>

      <p className="mt-4 text-sm text-sand">
        Preço: {formatEth(min.toFixed(2))} – {formatEth(max.toFixed(2))} ETH
      </p>

      <Button type="button" onClick={apply} className="mt-4 h-auto px-5 py-2">
        Aplicar
      </Button>
    </fieldset>
  )
}
