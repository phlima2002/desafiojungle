import { HttpResponse, http } from 'msw'
import { env } from '@/shared/config/env'
import { expireSessions, mutateNft, resetDatabase } from '../db'
import { SCENARIOS, getScenarioName, setScenario, type ScenarioName } from '../scenarios'

const base = env.apiBaseUrl

/**
 * Control plane for the mock environment. It is only reachable while the mocks
 * are running and exists so that demos, the README walkthrough and Playwright
 * can drive scenarios without reaching into application code.
 */
export const devHandlers = [
  http.post(`${base}/__mock__/reset`, async () => {
    resetDatabase()
    return HttpResponse.json({ ok: true, scenario: getScenarioName() })
  }),

  http.get(`${base}/__mock__/scenario`, async () =>
    HttpResponse.json({
      current: getScenarioName(),
      available: Object.entries(SCENARIOS).map(([name, config]) => ({
        name,
        label: config.label,
        description: config.description,
      })),
    }),
  ),

  http.post(`${base}/__mock__/scenario`, async ({ request }) => {
    const body = (await request.json()) as { name?: string }
    if (!body.name || !(body.name in SCENARIOS)) {
      return HttpResponse.json({ error: 'unknown scenario' }, { status: 400 })
    }
    setScenario(body.name as ScenarioName)
    return HttpResponse.json({ ok: true, scenario: body.name })
  }),

  http.post(`${base}/__mock__/session/expire`, async () => {
    expireSessions()
    return HttpResponse.json({ ok: true })
  }),

  /** Changes a catalogue price/availability and emits the matching event. */
  http.post(`${base}/__mock__/nfts/:nftId`, async ({ request, params }) => {
    const body = (await request.json()) as { price?: string; available?: number; editionId?: string }
    const nft = mutateNft(String(params.nftId), (target) => {
      const edition = body.editionId
        ? target.editions.find((candidate) => candidate.id === body.editionId)
        : target.editions[0]
      if (!edition) return
      if (body.price !== undefined) {
        edition.price = body.price
        if (edition === target.editions[0]) target.price = body.price
      }
      if (body.available !== undefined) edition.available = body.available
    })
    if (!nft) return HttpResponse.json({ error: 'not found' }, { status: 404 })
    return HttpResponse.json(nft)
  }),
]
