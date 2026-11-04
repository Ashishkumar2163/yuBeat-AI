const express = require('express')
const { Readable } = require('node:stream')

const router = express.Router()
const AUDIUS_API_BASES = [
  'https://api.audius.co/v1',
  'https://discoveryprovider.audius.co/v1',
]
const APP_NAME = 'YueBeatAI'
const REQUEST_TIMEOUT_MS = 10000
const MAX_RETRIES = 2

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function audiusGet(path, params = {}) {
  const query = new URLSearchParams({ app_name: APP_NAME })
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  }

  let lastError
  for (const base of AUDIUS_API_BASES) {
    const url = `${base}${path}?${query.toString()}`
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const response = await fetchWithTimeout(url, {
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) {
          const body = await response.text().catch(() => '')
          lastError = new Error(`Audius ${new URL(base).host} returned HTTP ${response.status}: ${body.slice(0, 180)}`)
          if (response.status >= 500 && attempt < MAX_RETRIES) {
            await sleep(300 * (attempt + 1))
            continue
          }
          break
        }
        return await response.json()
      } catch (error) {
        lastError = error
        if (attempt < MAX_RETRIES) await sleep(300 * (attempt + 1))
      }
    }
  }
  throw lastError || new Error('All Audius API hosts failed')
}

function normalizeTrack(track) {
  if (!track?.id || !track?.title) return null
  const artwork = track.artwork
  const artworkUrl = typeof artwork === 'string'
    ? artwork
    : artwork?.['480x480'] || artwork?.['150x150'] || artwork?.['1000x1000'] || ''

  return {
    id: String(track.id),
    title: track.title,
    artist: track.user?.name || track.artist_name || 'Unknown artist',
    artworkUrl,
    duration: Number(track.duration) || 0,
    genre: track.genre || track.mood || '',
    permalink: track.permalink || '',
    streamUrl: `/api/music/stream/${encodeURIComponent(String(track.id))}`,
  }
}

function sendProviderError(res, action, error) {
  const timedOut = /timed out/i.test(String(error?.message || ''))
  console.error(`[music:${action}]`, error?.stack || error)
  return res.status(502).json({
    success: false,
    code: timedOut ? 'MUSIC_PROVIDER_TIMEOUT' : 'MUSIC_PROVIDER_UNAVAILABLE',
    message: timedOut
      ? 'Music provider timed out. Please try again in a moment.'
      : 'Music provider is temporarily unavailable. Please try again shortly.',
  })
}

router.get('/health', (_req, res) => {
  res.json({ success: true, service: 'music', provider: 'Audius' })
})

router.get('/search', async (req, res) => {
  const query = String(req.query.query || '').trim().slice(0, 120)
  if (!query) {
    return res.status(400).json({ success: false, message: 'Enter a music search term.' })
  }

  try {
    const payload = await audiusGet('/tracks/search', { query, limit: 25 })
    const tracks = (Array.isArray(payload?.data) ? payload.data : [])
      .map(normalizeTrack)
      .filter(Boolean)
    return res.json({ success: true, source: 'Audius', scope: 'global', tracks })
  } catch (error) {
    return sendProviderError(res, 'search', error)
  }
})

router.get('/trending', async (_req, res) => {
  try {
    const payload = await audiusGet('/tracks/trending', { limit: 25 })
    const tracks = (Array.isArray(payload?.data) ? payload.data : [])
      .map(normalizeTrack)
      .filter(Boolean)
    return res.json({ success: true, source: 'Audius', scope: 'global', tracks })
  } catch (error) {
    return sendProviderError(res, 'trending', error)
  }
})

router.get('/stream/:trackId', async (req, res) => {
  const trackId = String(req.params.trackId || '')
  if (!/^[a-zA-Z0-9_-]+$/.test(trackId)) {
    return res.status(400).json({ success: false, message: 'Invalid track ID.' })
  }

  let upstream
  try {
    let streamError
    for (const base of AUDIUS_API_BASES) {
      const url = new URL(`${base}/tracks/${encodeURIComponent(trackId)}/stream`)
      url.searchParams.set('app_name', APP_NAME)
      try {
        upstream = await fetchWithTimeout(url, { redirect: 'follow' }, 20000)
        if (upstream.ok && upstream.body) break
        streamError = new Error(`Audius stream host returned HTTP ${upstream.status}`)
        await upstream.body?.cancel().catch(() => {})
        upstream = null
      } catch (error) {
        streamError = error
      }
    }
    if (!upstream?.ok || !upstream.body) {
      throw streamError || new Error('All Audius stream hosts failed')
    }

    res.status(200)
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg')
    res.setHeader('Cache-Control', 'private, max-age=60')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    const contentLength = upstream.headers.get('content-length')
    if (contentLength) res.setHeader('Content-Length', contentLength)

    const audioStream = Readable.fromWeb(upstream.body)
    audioStream.on('error', error => {
      console.error('[music:stream] upstream stream error:', error.message)
      if (!res.headersSent) res.status(502).json({ success: false, message: 'Audio stream interrupted.' })
      else res.destroy(error)
    })
    res.on('close', () => {
      if (!res.writableEnded) audioStream.destroy()
    })
    audioStream.pipe(res)
  } catch (error) {
    await upstream?.body?.cancel().catch(() => {})
    console.error('[music:stream]', error?.stack || error)
    if (!res.headersSent) {
      const timedOut = error?.name === 'AbortError'
      res.status(502).json({
        success: false,
        code: timedOut ? 'MUSIC_STREAM_TIMEOUT' : 'MUSIC_STREAM_UNAVAILABLE',
        message: timedOut
          ? 'Audio provider timed out. Please try again.'
          : 'Audio stream is temporarily unavailable. Try another track.',
      })
    } else {
      res.destroy(error)
    }
  }
})

module.exports = router
