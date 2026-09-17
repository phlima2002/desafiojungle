/**
 * Lighthouse audit for the two pages the challenge asks about: Início and
 * Detalhes do NFT, in both the mobile and desktop profiles.
 *
 * Three runs per page/profile; the median of each category is reported, along
 * with LCP, CLS and TBT. Reports (HTML + JSON) land in lighthouse/reports/.
 *
 * The audited build is the real production build with the mock layer enabled —
 * no page is simplified to inflate a score. The `instant` scenario is used so
 * that the simulated latency does not dominate the measurement; every image,
 * font and feature of the delivery is loaded.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { launch } from 'chrome-launcher'
import lighthouse from 'lighthouse'
import { preview } from 'vite'

const RUNS = Number(process.env.LH_RUNS ?? 3)
const OUT_DIR = new URL('../lighthouse/reports/', import.meta.url)
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
const TARGETS = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }

const ALL_PAGES = [
  { id: 'inicio', path: '/?scenario=instant' },
  { id: 'detalhe', path: '/nft/emerald-ape-100?scenario=instant' },
]
const PAGES = process.env.LH_PAGES
  ? ALL_PAGES.filter((page) => process.env.LH_PAGES.split(',').includes(page.id))
  : ALL_PAGES

const PROFILES = (process.env.LH_PROFILES ?? 'mobile,desktop').split(',')

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true })

  const server = await preview({ preview: { port: 4180, strictPort: true } })
  const origin = server.resolvedUrls.local[0].replace(/\/$/, '')

  const chrome = await launch({
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
    chromePath: process.env.CHROMIUM_PATH || process.env.CHROME_PATH,
  })

  const summary = []

  for (const profile of PROFILES) {
    for (const page of PAGES) {
      const url = `${origin}${page.path}`
      const runs = []

      for (let attempt = 1; attempt <= RUNS; attempt += 1) {
        const result = await lighthouse(
          url,
          { port: chrome.port, output: ['html', 'json'], logLevel: 'error' },
          {
            extends: 'lighthouse:default',
            settings: {
              formFactor: profile,
              screenEmulation:
                profile === 'desktop'
                  ? { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }
                  : undefined,
              throttling:
                profile === 'desktop'
                  ? { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 }
                  : undefined,
            },
          },
        )

        const { lhr, report } = result
        const base = new URL(`${page.id}-${profile}-run${attempt}`, OUT_DIR)
        await writeFile(`${base.pathname}.html`, report[0])
        await writeFile(`${base.pathname}.json`, report[1])

        runs.push({
          scores: Object.fromEntries(
            CATEGORIES.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)]),
          ),
          lcp: lhr.audits['largest-contentful-paint']?.numericValue ?? 0,
          cls: lhr.audits['cumulative-layout-shift']?.numericValue ?? 0,
          tbt: lhr.audits['total-blocking-time']?.numericValue ?? 0,
          version: lhr.lighthouseVersion,
          userAgent: lhr.environment?.hostUserAgent,
        })
      }

      const entry = {
        page: page.id,
        profile,
        url: page.path,
        runs: RUNS,
        scores: Object.fromEntries(CATEGORIES.map((c) => [c, median(runs.map((r) => r.scores[c]))])),
        metrics: {
          lcpMs: Math.round(median(runs.map((r) => r.lcp))),
          cls: Number(median(runs.map((r) => r.cls)).toFixed(3)),
          tbtMs: Math.round(median(runs.map((r) => r.tbt))),
        },
        lighthouseVersion: runs[0].version,
        userAgent: runs[0].userAgent,
      }

      summary.push(entry)
      const line = CATEGORIES.map((c) => {
        const value = entry.scores[c]
        return `${c}=${value}${value >= TARGETS[c] ? '' : ` (meta ${TARGETS[c]})`}`
      }).join('  ')
      console.log(
        `${page.id}/${profile}  ${line}  LCP=${entry.metrics.lcpMs}ms CLS=${entry.metrics.cls} TBT=${entry.metrics.tbtMs}ms`,
      )
    }
  }

  await writeFile(
    new URL('summary.json', OUT_DIR).pathname,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        node: process.version,
        lighthouse: summary[0]?.lighthouseVersion,
        runsPerPage: RUNS,
        scenario: 'instant',
        results: summary,
      },
      null,
      2,
    ),
  )

  await chrome.kill()
  await server.close()
  createServer().close()
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
