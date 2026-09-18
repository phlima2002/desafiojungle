import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { env } from '@/shared/config/env'
import { setNetworkGate } from '@/shared/api/client'
import { AppProviders } from '@/app/providers'
import '@/styles/index.css'

function bootstrap() {
  const container = document.getElementById('root')
  if (!container) throw new Error('Elemento #root não encontrado')

  // The shell paints before the mock layer is parsed. Requests are held by the
  // network gate until the worker is running, so nothing escapes to the real
  // network — the collector just sees skeletons a little sooner.
  //
  // `socket.io-client` is imported lazily by the realtime client, so nothing in
  // the application graph captures `globalThis.WebSocket` before MSW installs
  // its override.
  let releaseGate: (() => void) | undefined
  if (env.enableMocks) {
    setNetworkGate(
      new Promise<void>((resolve) => {
        releaseGate = resolve
      }),
    )
  }

  // The document already carries a painted shell (see `app/static-shell.ts`).
  // Yielding one frame before the first React render lets the browser put it on
  // screen instead of holding the first paint until the whole tree is committed:
  // on a fast connection the bundle arrives before any frame has been produced,
  // and without this the shell would never be seen. The cost is a single frame.
  const render = () =>
    createRoot(container).render(
      <StrictMode>
        <AppProviders />
      </StrictMode>,
    )

  requestAnimationFrame(() => setTimeout(render, 0))

  if (env.enableMocks) {
    // A camada de mocks tem ~165 kB gzip; analisá-la logo depois da primeira
    // pintura empurra o *total blocking time* para cima sem adiantar nada, já
    // que as requisições estão seguras no network gate. Então ela espera a
    // thread principal ficar ociosa — com teto, para que uma página que nunca
    // fica ociosa não deixe o colecionador em skeleton eterno.
    const boot = async () => {
      const { startMockServer } = await import('@/mocks/browser')
      await startMockServer()
      releaseGate?.()
    }

    const schedule =
      'requestIdleCallback' in window
        ? () => window.requestIdleCallback(() => void boot(), { timeout: 1_000 })
        : () => window.setTimeout(() => void boot(), 0)

    // Duas cessões antes de agendar: uma para o commit do React, outra para o
    // navegador pintar.
    requestAnimationFrame(() => setTimeout(schedule, 0))
  }
}

void bootstrap()
