import { Link } from '@tanstack/react-router'
import { Fragment } from 'react'

type Crumb = { label: string; to?: '/' | '/mercado' | '/carrinho' }

export function Breadcrumb({ items }: { items: readonly Crumb[] }) {
  return (
    <nav aria-label="Trilha de navegação" className="text-sm font-bold">
      <ol className="flex flex-wrap items-center">
        {items.map((item, index) => (
          <Fragment key={item.label}>
            {index > 0 ? (
              <li aria-hidden className="px-2 text-clay">
                /
              </li>
            ) : null}
            <li>
              {item.to ? (
                <Link
                  to={item.to}
                  search={item.to === '/carrinho' ? undefined : ({} as never)}
                  className="text-sand hover:text-accent"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-accent" aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
