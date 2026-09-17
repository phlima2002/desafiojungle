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

  createRoot(container).render(
    <StrictMode>
      <AppProviders />
    </StrictMode>,
  )

  if (env.enableMocks) {
    // Yield twice: once for React's commit, once for the browser to paint.
    requestAnimationFrame(() => {
      setTimeout(async () => {
        const { startMockServer } = await import('@/mocks/browser')
        await startMockServer()
        releaseGate?.()
      }, 0)
    })
  }
}

void bootstrap()
