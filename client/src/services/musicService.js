
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
).replace(/\/+$/, '')

const API_URL = `${API_BASE_URL}/api`

async function musicRequest(path, { timeout = 15000 } = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })

    const result = await response.json().catch(() => ({}))

    if (!response.ok || result.success !== true) {
      throw new Error(
        result.message || `Music request failed (${response.status})`
      )
    }

    return result
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Music request timed out. Please try again.')
    }

    if (error instanceof TypeError) {
      throw new Error(
        `Cannot connect to the backend at ${API_BASE_URL}. Check the server and CORS settings.`
      )
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function searchMusic(query) {
  const trimmedQuery = String(query || '').trim()

  if (!trimmedQuery) return []

  const params = new URLSearchParams({ query: trimmedQuery })
  const result = await musicRequest(
    `/music/search?${params.toString()}`
  )

  return Array.isArray(result.tracks) ? result.tracks : []
}

export async function getTrendingMusic() {
  const result = await musicRequest('/music/trending')

  return Array.isArray(result.tracks) ? result.tracks : []
}

export function getTrackStreamUrl(trackId) {
  if (trackId === undefined || trackId === null || String(trackId).trim() === '') {
    throw new Error('A valid track ID is required.')
  }

  return `${API_URL}/music/stream/${encodeURIComponent(String(trackId))}`
}
