/**
 * Search-param serialisation for the whole app.
 *
 * TanStack Router's default encodes values as JSON, which turns a multi-select
 * filter into `categoria=%5B%22arte-digital%22%5D`. Catalogue URLs are meant to
 * be read, shared and compared against the API's own query string, so arrays are
 * written as repeated keys — `categoria=arte-digital&categoria=fotografia` —
 * and scalars as plain text.
 */
export function parseSearch(searchStr: string): Record<string, unknown> {
  const params = new URLSearchParams(searchStr)
  const result: Record<string, unknown> = {}

  for (const key of new Set(params.keys())) {
    const values = params.getAll(key)
    result[key] = values.length > 1 ? values : values[0]
  }

  return result
}

export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === '') continue

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null && item !== '') params.append(key, String(item))
      }
      continue
    }

    params.set(key, String(value))
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}
