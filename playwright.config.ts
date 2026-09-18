import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PREVIEW_PORT ?? 4173)
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

/**
 * The suite always runs against the production build with the mocks enabled, so
 * what is tested is what is deployed. A locally installed Chromium can be
 * pointed at with CHROMIUM_PATH when the sandbox has its own binary.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  timeout: 45_000,
  expect: {
    timeout: 10_000,
    // 0,2% de uma captura de página inteira ainda absorve a diferença de
    // antialiasing entre execuções, mas não esconde um controle novo na barra
    // do catálogo — com os 2% de antes, a busca inteira coube dentro da
    // tolerância e a suíte passou sem enxergar a mudança.
    toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled', caret: 'hide' },
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    ...(process.env.CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.CHROMIUM_PATH } } : {}),
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port ' + PORT + ' --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
