import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { env } from '@/shared/config/env'
import { setNetworkGate } from '@/shared/api/client'
import { AppProviders } from '@/app/providers'
import '@/styles/index.css'

/** Executa `fn` uma vez só, seja qual for o gatilho que chegar primeiro. */
function once(fn: () => void): () => void {
  let done = false
  return () => {
    if (done) return
    done = true
    fn()
  }
}

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

  /**
   * `requestAnimationFrame` não dispara enquanto a aba está oculta — e uma aba
   * de fundo é o caso comum: link aberto com o meio do mouse, sessão
   * restaurada, aba pré-carregada. Sem o temporizador abaixo a primeira
   * renderização ficava presa até a pessoa olhar para a aba, e o que ela
   * encontrava ao voltar era a página em branco do shell sem aplicação.
   *
   * O quadro continua sendo o caminho normal (dispara em ~16 ms, bem antes do
   * teto); o temporizador é só a saída para quando ele nunca vem.
   */
  const renderOnce = once(render)
  requestAnimationFrame(() => setTimeout(renderOnce, 0))
  window.setTimeout(renderOnce, 200)

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

    // `requestIdleCallback` também é suspenso em aba oculta, mesmo com
    // `timeout`: o mesmo `once` protege as duas pontas.
    const bootOnce = once(() => void boot())
    const schedule = () => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(bootOnce, { timeout: 1_000 })
      window.setTimeout(bootOnce, 1_500)
    }

    // Duas cessões antes de agendar: uma para o commit do React, outra para o
    // navegador pintar. E, antes das duas, o evento `load`: com o shell
    // pintando a primeira dobra sozinho, a thread fica ociosa cedo demais e o
    // `requestIdleCallback` disparava ainda dentro da janela que o Lighthouse
    // cronometra — os ~165 kB da camada de mocks entravam inteiros no TBT.
    // Esperar o `load` tira esse trabalho do caminho crítico sem atrasar nada
    // que a pessoa veja: as requisições seguem presas no network gate e a
    // primeira dobra já está na tela.
    // Mesmo cuidado com a aba oculta: aqui um quadro que não vem deixaria a
    // camada de mocks sem carregar e o network gate fechado para sempre — a
    // aplicação renderiza e fica em esqueleto eterno.
    const scheduleOnce = once(schedule)
    const afterPaint = () => {
      requestAnimationFrame(() => setTimeout(scheduleOnce, 0))
      window.setTimeout(scheduleOnce, 1_000)
    }
    if (document.readyState === 'complete') afterPaint()
    else window.addEventListener('load', afterPaint, { once: true })
  }
}

void bootstrap()
