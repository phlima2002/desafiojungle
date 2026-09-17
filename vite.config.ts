import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))

/**
 * The variable font is imported from the stylesheet, so the browser only
 * discovers it after the CSS has been parsed. Preloading the latin subset makes
 * the discovery immediate and removes a round trip from first paint.
 */
/**
 * Inlines the single stylesheet into the document. The bundle is ~7 kB gzipped
 * and it is render-blocking either way; inlining removes a full round trip from
 * first paint on a slow connection.
 */
function inlineStylesheet() {
  return {
    name: 'kurio:inline-stylesheet',
    apply: 'build' as const,
    enforce: 'post' as const,
    generateBundle(
      _options: unknown,
      bundle: Record<string, { fileName?: string; source?: string | Uint8Array; type?: string }>,
    ) {
      const cssFile = Object.values(bundle).find(
        (file) => file.type === 'asset' && /\.css$/.test(file.fileName ?? ''),
      )
      const html = Object.values(bundle).find((file) => file.fileName === 'index.html')
      if (!cssFile || !html || typeof html.source !== 'string') return

      const css = String(cssFile.source)
      html.source = html.source.replace(
        new RegExp(`<link[^>]+href="/${cssFile.fileName}"[^>]*>`),
        `<style>${css}</style>`,
      )
      delete bundle[cssFile.fileName!]
    },
  }
}

function preloadLatinFont() {
  let fontHref: string | undefined

  return {
    name: 'kurio:preload-latin-font',
    apply: 'build' as const,
    generateBundle(_options: unknown, bundle: Record<string, { fileName?: string }>) {
      const asset = Object.values(bundle).find((file) =>
        /roboto-mono-latin-wght-normal-.*\.woff2$/.test(file.fileName ?? ''),
      )
      if (asset?.fileName) fontHref = `/${asset.fileName}`
    },
    transformIndexHtml() {
      if (!fontHref) return []
      return [
        {
          tag: 'link',
          attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: fontHref, crossorigin: '' },
          injectTo: 'head' as const,
        },
      ]
    },
  }
}

export default defineConfig({
  plugins: [
    preloadLatinFont(),
    inlineStylesheet(),
    tanstackRouter({ target: 'react', autoCodeSplitting: false }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(rootDir, './src'),
    },
  },
  build: {
    target: 'es2022',
    cssMinify: 'lightningcss',
    rollupOptions: {
      output: {
        // Only genuinely shared, always-needed libraries get a fixed chunk.
        // Everything else is placed by the bundler next to the route that uses
        // it, so a visitor on the home page never downloads the form runtime or
        // the socket transport.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          // engine.io captures `globalThis.WebSocket` when its module is
          // evaluated, so the Socket.IO *client* must never be pulled into the
          // mocks chunk — it has to load after MSW installs its override.
          if (id.includes('socket.io-client') || id.includes('engine.io-client')) return 'realtime'
          if (id.includes('/msw/') || id.includes('@mswjs') || id.includes('.io-parser')) return 'mocks'
          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('scheduler')) return 'react'
          if (id.includes('@tanstack/react-router') || id.includes('@tanstack/router')) return 'router'
          if (id.includes('@tanstack/react-query') || id.includes('@tanstack/query')) return 'query'
          if (id.includes('/zod/')) return 'zod'
          return undefined
        },
      },
    },
  },
})
