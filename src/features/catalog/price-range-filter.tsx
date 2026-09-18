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
 * Two range inputs rather than one custom dual-thumb control: each thumb is a
 * real slider with its own label, so the filter is operable by keyboard and
 * announced correctly, which a div-based slider would have to reimplement.
 */
export function PriceRangeFilter({ bounds, value, onApply }: PriceRangeFilterProps) {
  const floor = Number(bounds.min)
  const ceiling = Number(bounds.max)

  // Initialised from the URL. The caller re-mounts this component (via `key`)
  // whenever the URL changes elsewhere — back/forward, "limpar filtros", a
  // shared link — which is React's own way of resetting state from props.
  const [min, setMin] = useState(() => Number(value.min ?? bounds.min))
  const [max, setMax] = useState(() => Number(value.max ?? bounds.max))

  const apply = () => {
    onApply({
      min: min > floor ? min.toFixed(2) : undefined,
      max: max < ceiling ? max.toFixed(2) : undefined,
    })
  }

  return (
    <fieldset className="rounded-md bg-card p-5">
      <legend className="mb-3 text-lg font-bold">Faixa de preço</legend>

      <div className="space-y-2">
        <label className="block">
          <span className="sr-only">Preço mínimo em ETH</span>
          <input
            type="range"
            min={floor}
            max={ceiling}
            step={STEP}
            value={min}
            onChange={(event) => setMin(Math.min(Number(event.target.value), max))}
            className="w-full accent-[var(--color-primary)]"
          />
        </label>
        <label className="block">
          <span className="sr-only">Preço máximo em ETH</span>
          <input
            type="range"
            min={floor}
            max={ceiling}
            step={STEP}
            value={max}
            onChange={(event) => setMax(Math.max(Number(event.target.value), min))}
            className="w-full accent-[var(--color-primary)]"
          />
        </label>
      </div>

      <p className="mt-3 text-sm text-sand">
        Preço: {formatEth(min.toFixed(2))} – {formatEth(max.toFixed(2))} ETH
      </p>

      <Button type="button" onClick={apply} className="mt-3 h-auto px-4 py-1.5">
        Aplicar
      </Button>
    </fieldset>
  )
}
