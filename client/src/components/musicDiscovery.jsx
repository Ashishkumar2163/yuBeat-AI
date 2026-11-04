import { useEffect, useState } from 'react'
import { AudioLines, Globe2, LoaderCircle, Music2, Play, Search, TrendingUp } from 'lucide-react'
import { getTrendingMusic, searchMusic } from '../services/musicService'
import './MusicDiscovery.css'

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

export default function MusicDiscovery({ onSelectTrack, selectedTrackId = '' }) {
  const [mode, setMode] = useState('instrumental')
  const [query, setQuery] = useState('instrumental beats')
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadTracks(nextMode = mode, searchTerm = query) {
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const results = nextMode === 'trending'
        ? await getTrendingMusic()
        : await searchMusic(searchTerm.trim() || 'instrumental')
      setTracks(results)
      if (!results.length) {
        setNotice(nextMode === 'trending'
          ? 'Audius returned no trending tracks right now.'
          : 'No matching tracks were returned. Try another keyword.')
      }
    } catch (err) {
      setTracks([])
      setError(err.message || 'Could not load music right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTracks('instrumental', 'instrumental beats')
    // Load once on mount; user actions explicitly trigger subsequent requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function changeMode(nextMode) {
    setMode(nextMode)
    if (nextMode === 'trending') loadTracks('trending', query)
    else loadTracks('instrumental', query.trim() || 'instrumental beats')
  }

  function handleSubmit(event) {
    event.preventDefault()
    setMode('instrumental')
    loadTracks('instrumental', query)
  }

  return (
    <section className="music-discovery" aria-label="Global music discovery">
      <div className="music-discovery-heading">
        <div className="music-discovery-title">
          <span className="music-discovery-icon"><Globe2 size={18} /></span>
          <div>
            <h3>Discover music worldwide</h3>
            <p>Search and preview tracks from the Audius open music catalog.</p>
          </div>
        </div>
        <span className="music-source-badge">AUDIUS · GLOBAL</span>
      </div>

      <div className="music-discovery-tabs" role="tablist" aria-label="Music category">
        <button type="button" role="tab" aria-selected={mode === 'instrumental'} className={mode === 'instrumental' ? 'active' : ''} onClick={() => changeMode('instrumental')}>
          <Music2 size={15} /> Instrumentals & beats
        </button>
        <button type="button" role="tab" aria-selected={mode === 'trending'} className={mode === 'trending' ? 'active' : ''} onClick={() => changeMode('trending')}>
          <TrendingUp size={15} /> Global trending
        </button>
      </div>

      <form className="music-search-form" onSubmit={handleSubmit}>
        <Search size={17} aria-hidden="true" />
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search lo-fi, piano, ambient, instrumental..."
          aria-label="Search music"
          maxLength={120}
        />
        <button type="submit" disabled={loading}>
          {loading ? <LoaderCircle size={16} className="music-spin" /> : 'Search'}
        </button>
      </form>

      {error && <div className="music-discovery-message error" role="alert">{error}. Check that the Express music routes are registered and the backend is running.</div>}
      {notice && !error && <div className="music-discovery-message">{notice}</div>}

      <div className="music-results-meta">
        <span>{loading ? 'Searching the live catalog…' : `${tracks.length} provider result${tracks.length === 1 ? '' : 's'}`}</span>
        <span>Global catalog · not country-specific charts</span>
      </div>

      <div className="music-results-list">
        {tracks.map(track => (
          <article className={`music-result ${selectedTrackId === track.id ? 'selected' : ''}`} key={track.id}>
            <div className="music-result-art">
              {track.artworkUrl
                ? <img src={track.artworkUrl} alt="" loading="lazy" />
                : <AudioLines size={21} />}
            </div>
            <div className="music-result-copy">
              <strong title={track.title}>{track.title}</strong>
              <span title={track.artist}>{track.artist || 'Unknown artist'}</span>
              <small>{track.genre || 'Genre not supplied'} · {formatDuration(track.duration)}</small>
            </div>
            <button
              type="button"
              className="music-use-button"
              onClick={() => onSelectTrack(track)}
              aria-label={`Use ${track.title}`}
            >
              <Play size={14} fill="currentColor" /> Use track
            </button>
          </article>
        ))}
        {!loading && !tracks.length && !error && (
          <div className="music-empty-state">No tracks to display yet. Try searching “lofi beats” or “instrumental”.</div>
        )}
      </div>

      <p className="music-discovery-footnote">
        Tracks and previews are supplied by Audius. Instrumental search uses search keywords; provider metadata may not reliably classify every track. Rights and availability can vary by track.
      </p>
    </section>
  )
}
