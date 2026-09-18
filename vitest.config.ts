import { defineConfig } from 'vitest/config'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))

/**
 * Configuração própria, separada da do Vite: o build carrega os plugins do
 * TanStack Router e do Tailwind, que não têm o que fazer numa suíte de unidade
 * — e o plugin do roteador geraria a árvore de rotas a cada execução.
 */
export default defineConfig({
  resolve: { alias: { '@': resolve(rootDir, './src') } },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
})
