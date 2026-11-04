import { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'
import {
  AudioLines,
  Check,
  ChevronDown,
  Clapperboard,
  Globe2,
  Languages,
  Menu,
  Music2,
  Pause,
  Play,
  Repeat2,
  Settings2,
  Sparkles,
  Upload,
  WandSparkles,
  X,
} from 'lucide-react'
import './App.css'
import MusicDiscovery from './components/MusicDiscovery'
import { getTrackStreamUrl } from './services/musicService'
import { getProjects, saveProject, getProjectById, updateProject, deleteProject } from './services/projectServices'

const languages = [
  'English', 'Hindi', 'Chinese', 'Japanese', 'Korean', 'German', 'French',
  'Marathi', 'Spanish', 'Arabic', 'Bengali', 'Tamil', 'Portuguese',
  'Russian', 'Italian', 'Dutch', 'Turkish', 'Thai', 'Vietnamese', 'Indonesian',
  'Urdu', 'Punjabi', 'Gujarati', 'Telugu', 'Kannada', 'Malayalam', 'Other languages',
]

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '')
const LANGUAGE_CODES = { English:'en', Hindi:'hi', Chinese:'zh-Hans', Japanese:'ja', Korean:'ko', German:'de', French:'fr', Marathi:'mr', Spanish:'es', Arabic:'ar', Bengali:'bn', Tamil:'ta', Portuguese:'pt', Russian:'ru', Italian:'it', Dutch:'nl', Turkish:'tr', Thai:'th', Vietnamese:'vi', Indonesian:'id', Urdu:'ur', Punjabi:'pa', Gujarati:'gu', Telugu:'te', Kannada:'kn', Malayalam:'ml', 'Other languages':'auto' }

const templates = [
  { id: 'neon', name: 'Neon Pulse', color: '#b69aff' },
  { id: 'minimal', name: 'Clean Focus', color: '#67e8f9' },
  { id: 'sunset', name: 'Sunset Motion', color: '#fb923c' },
  { id: 'study', name: 'Study Mode', color: '#86efac' },
  { id: 'karaoke', name: 'Karaoke Glow', color: '#f9a8d4' },
  { id: 'cinematic', name: 'Cinematic Gold', color: '#fcd34d' },
  { id: 'ocean', name: 'Ocean Wave', color: '#38bdf8' },
  { id: 'forest', name: 'Forest Calm', color: '#4ade80' },
  { id: 'lavender', name: 'Lavender Dream', color: '#c4b5fd' },
  { id: 'cherry', name: 'Cherry Pop', color: '#fb7185' },
  { id: 'paper', name: 'Paper Notes', color: '#d6d3d1' },
  { id: 'midnight', name: 'Midnight Gold', color: '#facc15' },
  { id: 'aurora', name: 'Aurora Lights', color: '#5eead4' },
  { id: 'cyberpunk', name: 'Cyberpunk City', color: '#e879f9' },
  { id: 'pastel', name: 'Pastel Dreams', color: '#f9a8d4' },
  { id: 'retro', name: 'Retro Wave', color: '#fb7185' },
  { id: 'monochrome', name: 'Monochrome', color: '#e5e7eb' },
  { id: 'royal', name: 'Royal Purple', color: '#a78bfa' },
  { id: 'fire', name: 'Fire Beat', color: '#fb923c' },
  { id: 'ice', name: 'Arctic Ice', color: '#bae6fd' },
  { id: 'matrix', name: 'Matrix Code', color: '#22c55e' },
  { id: 'blossom', name: 'Sakura Blossom', color: '#fda4af' },
  { id: 'desert', name: 'Desert Sand', color: '#d6a76c' },
  { id: 'comic', name: 'Comic Pop', color: '#facc15' },
  { id: 'vintage', name: 'Vintage Film', color: '#c4a484' },
]

export default function App() {
  const [language, setLanguage] = useState('English')
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [layout, setLayout] = useState('four')
  const [repeatCount, setRepeatCount] = useState(4)
  const [wordsText, setWordsText] = useState('Focus\nDiscipline\nConsistency\nSuccess')
  const [template, setTemplate] = useState('neon')
  const [bpm, setBpm] = useState(120)
  const [timing, setTiming] = useState('1 beat')
  const [showMeaning, setShowMeaning] = useState(true)
  const [showPinyin, setShowPinyin] = useState(true)
  const [audioName, setAudioName] = useState('')
  const [audioSrc, setAudioSrc] = useState('')
  const [selectedMusicTrackId, setSelectedMusicTrackId] = useState('')
  const audioRef = useRef(null)
  const previewRef = useRef(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportAspect, setExportAspect] = useState('vertical')
  const [exportResolution, setExportResolution] = useState('1080p')
  const [exportQuality, setExportQuality] = useState('high')
  const [previewIndex, setPreviewIndex] = useState(0)
  const exportCancelledRef = useRef(false);
  const ffmpegInstanceRef = useRef(null);
  const ffmpegLoadedRef = useRef(false);
  const translationTimerRef = useRef(null);
  const translationRequestRef = useRef(0);
  const [targetLanguage, setTargetLanguage] = useState('Chinese')
  const [isTranslating, setIsTranslating] = useState(false)
  const [notice, setNotice] = useState('')
  const [projectTitle, setProjectTitle] = useState('My YueBeat Video')
  const [savedProjects, setSavedProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [projectBusy, setProjectBusy] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeWordIndex, setActiveWordIndex] = useState(0)

  // Supports simple words and: Chinese | Pinyin | English meaning
  const words = useMemo(
    () => wordsText
      .split(/[\n,]+/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split('|').map(part => part.trim())
        return {
          text: parts[0] || '',
          pronunciation: parts[1] || '',
          meaning: parts.slice(2).join(' | ') || '',
        }
      }),
    [wordsText],
  )

  const wordsPerSlide = layout === 'four' ? 4 : 1
  const totalSlides = Math.ceil(words.length / wordsPerSlide)
  const safeTotalSlides = Math.max(totalSlides, 1)
  const currentSlide = Math.min(previewIndex, safeTotalSlides - 1)
  const activeTemplate = templates.find(item => item.id === template) || templates[0]
  const beatsPerWord = timing === '2 beats' ? 2 : timing === '4 beats' ? 4 : 1
  const wordDurationMs = (60000 / bpm) * beatsPerWord


  const previewWords = useMemo(() => {
    if (words.length === 0) return []
    if (layout === 'four') {
      const startIndex = currentSlide * 4
      return words.slice(startIndex, startIndex + 4)
    }
    if (layout === 'repeat') {
      const word = words[currentSlide]
      return word ? Array(repeatCount).fill(word) : []
    }
    return words[currentSlide] ? [words[currentSlide]] : []
  }, [words, layout, repeatCount, currentSlide])

  // Release temporary browser URLs when an audio file is replaced or cleared.
  useEffect(() => {
    if (!audioSrc) return undefined
    return () => URL.revokeObjectURL(audioSrc)
  }, [audioSrc])

  // Highlight words in sequence and advance to the next slide when needed.
  useEffect(() => {
    if (!isPlaying) return undefined
    if (words.length === 0) {
      setIsPlaying(false)
      return undefined
    }

    const timer = window.setTimeout(() => {
      const nextWordIndex = activeWordIndex + 1
      if (nextWordIndex < previewWords.length) {
        setActiveWordIndex(nextWordIndex)
      } else if (currentSlide < safeTotalSlides - 1) {
        setPreviewIndex(currentSlide + 1)
        setActiveWordIndex(0)
      } else {
        setIsPlaying(false)
        setActiveWordIndex(0)
        if (audioRef.current) audioRef.current.pause()
      }
    }, wordDurationMs)

    return () => window.clearTimeout(timer)
  }, [isPlaying, words.length, safeTotalSlides, currentSlide, previewWords.length, activeWordIndex, wordDurationMs])


  function changeLanguage(value) {
    setLanguage(value)
    setPreviewIndex(0)
  }

  function goToPreviousSlide() {
    setIsPlaying(false)
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
    setActiveWordIndex(0)
    setPreviewIndex(index => Math.max(index - 1, 0))
  }

  function goToNextSlide() {
    setIsPlaying(false)
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
    setActiveWordIndex(0)
    setPreviewIndex(index => Math.min(index + 1, safeTotalSlides - 1))
  }

  async function handlePlaybackToggle() {
    if (isPlaying) {
      setIsPlaying(false)
      if (audioRef.current) audioRef.current.pause()
      return
    }
    if (words.length === 0) {
      setNotice('Add at least one word before playing the preview.')
      return
    }
    if (currentSlide >= safeTotalSlides - 1) {
      setPreviewIndex(0)
      if (audioRef.current) audioRef.current.currentTime = 0
    }
    setActiveWordIndex(0)
    if (audioRef.current && audioSrc) {
      try {
        await audioRef.current.play()
      } catch {
        setNotice('The preview can play, but your browser could not start the selected audio. Press play on the audio player and try again.')
        return
      }
    }
    setIsPlaying(true)
  }

  function handleLayoutChange(nextLayout) {
    setIsPlaying(false)
    if (audioRef.current) audioRef.current.pause()
    setActiveWordIndex(0)
    setLayout(nextLayout)
    setPreviewIndex(0)
  }

  function handleWordsChange(value) {
    setIsPlaying(false)
    if (audioRef.current) audioRef.current.pause()
    setActiveWordIndex(0)
    setWordsText(value)
    setPreviewIndex(0)
  }

  function handleSelectMusicTrack(track) {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlaying(false)
    setActiveWordIndex(0)
    setPreviewIndex(0)
    setSelectedMusicTrackId(track.id)
    setAudioName(`${track.title}.mp3`)
    setAudioSrc(getTrackStreamUrl(track.id))
    setNotice(`Selected track: ${track.title} — ${track.artist}. Check the track's usage terms before publishing.`)
  }

  function handleAudioFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('audio/')) {
      setNotice('Please choose a valid audio file.')
      event.target.value = ''
      return
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlaying(false)
    setActiveWordIndex(0)
    setPreviewIndex(0)
    setSelectedMusicTrackId('')
    setAudioName(file.name)
    setAudioSrc(URL.createObjectURL(file))
    setNotice(`Audio loaded: ${file.name}`)
  }


async function handleTranslateWords() {
  const entries = wordsText
    .split(/[\n,]+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split('|').map(part => part.trim())
      return {
        text: parts[0] || '',
        pronunciation: parts[1] || '',
      }
    })
    .filter(entry => entry.text)

  if (!entries.length) {
    setNotice('Add some words before translating.')
    return
  }

  if (language === targetLanguage) {
    setNotice('Choose a different target language to translate meanings.')
    return
  }

  setIsTranslating(true)
  setNotice(`Translating ${entries.length} word(s) to ${targetLanguage}…`)

  try {
    const translatedEntries = []

    for (const entry of entries) {
      const response = await fetch(`${API_BASE_URL}/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: entry.text,
          sourceLanguage:
            language === 'Other languages'
              ? 'auto'
              : (LANGUAGE_CODES[language] || 'auto'),
          targetLanguage: LANGUAGE_CODES[targetLanguage] || 'zh',
        }),
        signal: AbortSignal.timeout(25000),
      })

      const data = await response.json().catch(() => ({}))

      if (
        !response.ok ||
        !data.success ||
        typeof data.translatedText !== 'string'
      ) {
        throw new Error(
          `${data.message || `Could not translate "${entry.text}".`} (HTTP ${response.status})`
        )
      }

      translatedEntries.push({
        text: entry.text,
        pronunciation: entry.pronunciation,
        meaning: data.translatedText.trim(),
      })
    }

setWordsText(
  translatedEntries
    .map(entry =>
      [
        entry.text,
        entry.pronunciation || '',
        entry.meaning || '',
      ].join(' | ')
    )
    .join('\n')
)

    setShowMeaning(true)
    setPreviewIndex(0)
    setActiveWordIndex(0)

    setNotice(
      `Successfully translated ${translatedEntries.length} word(s). Meanings will appear below the original words in the preview and exported video.`
    )
  } catch (error) {
    console.error('YueBeat translation failed:', error)

    setNotice(
      `Translation failed: ${error.message}. Check that the backend and LibreTranslate are running.`
    )
  } finally {
    setIsTranslating(false)
  }
}



  function handleCancelExport() {
    if (!isExporting) return

    exportCancelledRef.current = true
    setNotice('Cancelling export… Please wait.')

    // FFmpeg.terminate() stops an active encode and rejects pending FFmpeg work.
    try {
      ffmpegInstanceRef.current?.terminate()
      ffmpegInstanceRef.current = null
      ffmpegLoadedRef.current = false
    } catch (error) {
      console.warn('Could not terminate FFmpeg cleanly:', error)
    }
  }

  function waitForPaint() {
  return new Promise(resolve => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve)
    })
  })
}

  async function handleExportVideo() {
    if (isExporting) return

    if (!words.length) {
      setNotice('Add at least one word before exporting your video.')
      return
    }
    if (!previewRef.current) {
      setNotice('The video preview is not ready. Refresh the page and try again.')
      return
    }

    const originalSlide = previewIndex
    const originalWord = activeWordIndex

    exportCancelledRef.current = false
    setIsPlaying(false)
    if (audioRef.current) audioRef.current.pause()
    setIsExporting(true)
    setExportProgress(0)
    setNotice('Preparing video frames… Keep this tab open until export finishes.')

    let ffmpeg = ffmpegInstanceRef.current
    if (!ffmpeg) {
      ffmpeg = new FFmpeg()
      ffmpegInstanceRef.current = ffmpeg
      ffmpeg.on('progress', ({ progress }) => {
        if (!exportCancelledRef.current && Number.isFinite(progress)) setExportProgress(75 + Math.min(19, Math.round(progress * 20)))
      })
    }

    const throwIfCancelled = () => {
      if (exportCancelledRef.current) {
        const error = new Error('Export cancelled by user.')
        error.name = 'ExportCancelledError'
        throw error
      }
    }

    const totalFrames = layout === 'four'
      ? words.length
      : layout === 'repeat'
        ? words.length * repeatCount
        : words.length
    const frameDuration = Math.max(0.25, wordDurationMs / 1000)
    const frameFiles = []
    let ffmpegTerminated = false

    try {
      if (!ffmpegLoadedRef.current) {
        await ffmpeg.load({ coreURL, wasmURL })
        ffmpegLoadedRef.current = true
      }
      throwIfCancelled()

      let frameNumber = 0
      for (let slide = 0; slide < safeTotalSlides; slide += 1) {
        throwIfCancelled()
        setPreviewIndex(slide)
        await waitForPaint()
        throwIfCancelled()

        const slots = layout === 'four'
          ? Math.min(4, words.length - slide * 4)
          : layout === 'repeat'
            ? repeatCount
            : 1

        for (let slot = 0; slot < slots; slot += 1) {
          throwIfCancelled()
          setActiveWordIndex(slot)
          await waitForPaint()
          throwIfCancelled()

          const canvas = await html2canvas(previewRef.current, {
            scale: 1,
            useCORS: true,
            backgroundColor: null,
            logging: false,
          })
          throwIfCancelled()

          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82))
          if (!blob) throw new Error('Could not capture a video frame.')
          throwIfCancelled()

          const fileName = `frame-${String(frameNumber).padStart(5, '0')}.jpg`
          await ffmpeg.writeFile(fileName, await fetchFile(blob))
          frameFiles.push(fileName)
          frameNumber += 1
          setExportProgress(Math.round((frameNumber / totalFrames) * 70))
        }
      }

      throwIfCancelled()

      // The concat demuxer needs a final image entry after the last duration.
      const concatLines = []
      frameFiles.forEach(fileName => {
        concatLines.push(`file '${fileName}'`, `duration ${frameDuration.toFixed(3)}`)
      })
      concatLines.push(`file '${frameFiles[frameFiles.length - 1]}'`)
      await ffmpeg.writeFile('frames.txt', new TextEncoder().encode(concatLines.join('\n')))
      throwIfCancelled()

      const inputArgs = ['-f', 'concat', '-safe', '0', '-i', 'frames.txt']
      const hasAudio = Boolean(audioSrc)
     
      if (hasAudio) {
  const audioResponse = await fetch(audioSrc, {
    method: 'GET',
    cache: 'force-cache',
  })

  if (!audioResponse.ok) {
    throw new Error('Could not download the selected music track.')
  }

  throwIfCancelled()

  // Read audio directly as binary data
  const audioData = new Uint8Array(
    await audioResponse.arrayBuffer()
  )

  if (!audioData.length) {
    throw new Error('Selected music track is empty.')
  }

  throwIfCancelled()

  const audioExtension = (audioName.split('.').pop() || 'mp3')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

  const safeExtension = [
    'mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'webm',
  ].includes(audioExtension)
    ? audioExtension
    : 'mp3'

  const audioFileName = `background-audio.${safeExtension}`

  await ffmpeg.writeFile(audioFileName, audioData)
  inputArgs.push('-i', audioFileName)
}

      throwIfCancelled()
      setNotice('Encoding MP4… This can take a while for long videos.')
      setExportProgress(75)

      const baseResolution = exportResolution === '720p'
        ? 720
        : exportResolution === '4K'
          ? 2160
          : 1080
      const outputWidth = exportAspect === 'vertical'
        ? baseResolution
        : Math.round(baseResolution * 16 / 9)
      const outputHeight = exportAspect === 'vertical'
        ? Math.round(baseResolution * 16 / 9)
        : baseResolution
      const qualityArgs = exportQuality === 'standard'
        ? ['-preset', 'ultrafast', '-crf', '28']
        : exportQuality === 'maximum'
          ? ['-preset', 'ultrafast', '-crf', '18']
          : ['-preset', 'ultrafast', '-crf', '23']

      const outputArgs = [
        ...inputArgs,
        '-map', '0:v:0',
        ...(hasAudio ? ['-map', '1:a:0', '-c:a', 'aac', '-b:a', '192k', '-shortest'] : ['-an']),
        '-vf', `scale=${outputWidth}:${outputHeight}:force_original_aspect_ratio=decrease,pad=${outputWidth}:${outputHeight}:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p`,
        '-c:v', 'libx264',
        ...qualityArgs,
        '-movflags', '+faststart',
        'yuebeat-export.mp4',
      ]

      await ffmpeg.exec(outputArgs)
      throwIfCancelled()

      setExportProgress(95)
      const output = await ffmpeg.readFile('yuebeat-export.mp4')
      throwIfCancelled()

      const videoBlob = new Blob([output], { type: 'video/mp4' })
      const downloadUrl = URL.createObjectURL(videoBlob)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = `${(projectTitle || 'yuebeat-video').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'yuebeat-video'}.mp4`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000)

      setExportProgress(100)
      setNotice('MP4 export finished. Your download should be available.')
    } catch (error) {
      const wasCancelled = exportCancelledRef.current || error?.name === 'ExportCancelledError'
      if (wasCancelled) {
        ffmpegTerminated = true
        setNotice('Export cancelled. You can safely start a new export.')
      } else {
        console.error('YueBeat MP4 export failed:', error)
        setNotice(`MP4 export failed: ${error?.message || 'Unknown error'}. Check the browser console for details, then try a shorter video or a supported audio file.`)
      }
    } finally {
      // A terminated FFmpeg worker has no usable virtual filesystem to clean up.
      if (!ffmpegTerminated && !exportCancelledRef.current) {
        for (const fileName of frameFiles) {
          try { await ffmpeg.deleteFile(fileName) } catch { /* ignore cleanup errors */ }
        }
        for (const fileName of [
          'frames.txt',
          'yuebeat-export.mp4',
          'background-audio.mp3',
          'background-audio.wav',
          'background-audio.m4a',
          'background-audio.aac',
          'background-audio.ogg',
          'background-audio.flac',
          'background-audio.webm',
        ]) {
          try { await ffmpeg.deleteFile(fileName) } catch { /* ignore cleanup errors */ }
        }
      }

      if (ffmpegTerminated || exportCancelledRef.current) {
        ffmpegInstanceRef.current = null
        ffmpegLoadedRef.current = false
      }
      setPreviewIndex(originalSlide)
      setActiveWordIndex(originalWord)
      setIsPlaying(false)
      setIsExporting(false)
    }
  }

  function buildProjectData() {
    return {
      title: projectTitle.trim() || 'Untitled YueBeat Project',
      language,
      wordsText,
      layout,
      repeatCount,
      template,
      bpm,
      timing,
      showMeaning,
      showPinyin,
      audioName,
    }
  }

  async function handleSaveProject() {
    setProjectBusy(true)
    setNotice('')
    try {
      const projectData = buildProjectData()
      const project = selectedProjectId
        ? await updateProject(selectedProjectId, projectData)
        : await saveProject(projectData)
      setSelectedProjectId(project._id)
      setNotice(`${selectedProjectId ? 'Project updated' : 'Project saved'} successfully: ${project.title}`)
      const projects = await getProjects()
      setSavedProjects(projects)
    } catch (error) {
      setNotice(`Could not save project: ${error.message}`)
    } finally {
      setProjectBusy(false)
    }
  }

  async function handleLoadProjects(showMessage = true) {
    setProjectBusy(true)
    setNotice('')
    try {
      const projects = await getProjects()
      setSavedProjects(projects)
      if (showMessage) {
        setNotice(projects.length ? `Loaded ${projects.length} saved project(s).` : 'No saved projects yet.')
      }
    } catch (error) {
      setNotice(`Could not load projects: ${error.message}`)
    } finally {
      setProjectBusy(false)
    }
  }

  async function handleDeleteProject() {
    if (!selectedProjectId) {
      setNotice('Choose a saved project to delete.')
      return
    }
    const confirmed = window.confirm('Are you sure you want to permanently delete this project?')
    if (!confirmed) return
    setProjectBusy(true)
    setNotice('')
    try {
      await deleteProject(selectedProjectId)
      setSavedProjects(current => current.filter(project => project._id !== selectedProjectId))
      setSelectedProjectId('')
      setNotice('Project deleted successfully.')
    } catch (error) {
      setNotice(`Could not delete project: ${error.message}`)
    } finally {
      setProjectBusy(false)
    }
  }

  function handleNewProject() {
    setIsPlaying(false)
    setActiveWordIndex(0)
    const hasContent = wordsText.trim() !== ''
    if (hasContent) {
      const confirmed = window.confirm('Start a new project? Make sure your current changes are saved first.')
      if (!confirmed) return
    }
    setSelectedProjectId('')
    setProjectTitle('Untitled YueBeat Project')
    setLanguage('English')
    setLayout('four')
    setRepeatCount(4)
    setWordsText('')
    setTemplate('neon')
    setBpm(120)
    setTiming('1 beat')
    setShowMeaning(true)
    setShowPinyin(true)
    setAudioName('')
    setSelectedMusicTrackId('')
    setAudioSrc('')
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
    setPreviewIndex(0)
    setNotice('New project started. Your saved projects are unchanged.')
  }

  async function handleOpenProject() {
    if (!selectedProjectId) {
      setNotice('Choose a saved project first.')
      return
    }
    setProjectBusy(true)
    setNotice('')
    try {
      const project = await getProjectById(selectedProjectId)
      setIsPlaying(false)
      setActiveWordIndex(0)
      setProjectTitle(project.title || 'Untitled YueBeat Project')
      setLanguage(project.language || 'English')
      setWordsText(project.wordsText || '')
      setLayout(project.layout || 'four')
      setRepeatCount(project.repeatCount || 4)
      setTemplate(project.template || 'neon')
      setBpm(project.bpm || 120)
      setTiming(project.timing || '1 beat')
      setShowMeaning(project.showMeaning ?? true)
      setShowPinyin(project.showPinyin ?? true)
      setAudioName(project.audioName || '')
      setSelectedMusicTrackId('')
      setAudioSrc('')
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
      setPreviewIndex(0)
      setNotice(project.audioName ? `Opened project: ${project.title}. Re-upload the audio file to play it; project saves keep the filename, not the local audio file.` : `Opened project: ${project.title}`)
    } catch (error) {
      setNotice(`Could not open project: ${error.message}`)
    } finally {
      setProjectBusy(false)
    }
  }

  return (
    <main className="app-shell">
      <button
      type="button"
     className="menu-toggle"
     onClick={() => setSidebarOpen(!sidebarOpen)}
    >
     <Menu size={20} />
    </button>
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <a className="brand" href="#home">
          <span className="brand-icon"><AudioLines size={23} /></span>
          <span>YueBeat <b>AI</b></span>
        </a>
        <p className="workspace-label">WORKSPACE</p>
        <button className="side-link active" type="button">
          <Clapperboard size={18} /> Video studio
        </button>
        <button className="side-link" type="button" onClick={() => setNotice('Choose a template from the gallery below.')}>
          <Sparkles size={18} /> Templates
        </button>
        <button className="side-link" type="button" onClick={() => setNotice('Project saving will be connected later.')}>
          <Music2 size={18} /> My projects
        </button>
        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <WandSparkles size={20} />
            <h3>Words meet rhythm.</h3>
            <p>Turn ideas into videos that move with the beat.</p>
          </div>
          <div className="profile">
            <span className="avatar">Y</span>
            <div><strong>Creator workspace</strong><small>Free workspace</small></div>
            <Settings2 size={17} />
          </div>
        </div>
      </aside>

      <section className="main-panel" id="home">
        <header className="topbar">
          <div className="breadcrumb">Studio <span>/</span> <strong>New video</strong></div>
          <div className="topbar-right">
            <span className="autosave"><i /> Local draft</span>
            <span className="avatar">Y</span>
          </div>
        </header>

        <div className="page-content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow"><Sparkles size={14} /> YOUR CREATIVE STUDIO</div>
              <h1>Make every word <span>hit different.</span></h1>
              <p className="subtitle">Create rhythm-ready word videos in a few simple steps.</p>
            </div>
            <div className="step-indicator"><b>01</b> SET UP YOUR VIDEO</div>
          </div>

          {notice && (
            <div className="notice" role="status">
              {notice}
              <button type="button" onClick={() => setNotice('')} aria-label="Dismiss notice"><X size={16} /></button>
            </div>
          )}

       
        
<section className={`panel-card project-toolbar ${projectsOpen ? "projects-expanded" : "projects-collapsed"}`}>
  <div className="project-toolbar-heading">
    <div>
      <h2>My Projects</h2>
      <p>Save your work and continue editing anytime.</p>
    </div>

    <div className="project-heading-actions">
      <button
        type="button"
        className="round-play project-refresh"
        onClick={() => handleLoadProjects()}
        disabled={projectBusy}
        title="Refresh saved projects"
      >
        Refresh
      </button>

      <button
        type="button"
        className="round-play"
        onClick={() => setProjectsOpen(!projectsOpen)}
        aria-expanded={projectsOpen}
      >
        {projectsOpen ? "Hide ▲" : "Show ▼"}
      </button>
    </div>
  </div>

  {projectsOpen && (
    <div className="project-toolbar-content">
      <div className="project-toolbar-row">
        <div className="project-name-field">
          <label className="field-label" htmlFor="project-title">
            Project name
          </label>
          <input
            id="project-title"
            type="text"
            value={projectTitle}
            onChange={event => setProjectTitle(event.target.value)}
            maxLength={100}
            placeholder="e.g. My First Music Video"
          />
        </div>

        <button
          type="button"
          className="export-button project-save"
          onClick={handleSaveProject}
          disabled={projectBusy || !projectTitle.trim()}
        >
          {projectBusy ? "Please wait…" : "Save project"}
        </button>

        <button
          type="button"
          className="round-play project-new"
          onClick={handleNewProject}
          disabled={projectBusy}
        >
          + New project
        </button>
      </div>

      <div className="project-toolbar-row saved-project-row">
        <div className="project-name-field">
          <label className="field-label" htmlFor="saved-projects">
            Saved projects
          </label>
          <select
            id="saved-projects"
            value={selectedProjectId}
            onChange={event => setSelectedProjectId(event.target.value)}
          >
            <option value="">Select a saved project…</option>
            {savedProjects.map(project => (
              <option key={project._id} value={project._id}>
                {project.title} · {project.language}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="round-play project-action"
          onClick={handleOpenProject}
          disabled={projectBusy || !selectedProjectId}
        >
          Open
        </button>

        <button
          type="button"
          className="round-play project-action project-delete"
          onClick={handleDeleteProject}
          disabled={projectBusy || !selectedProjectId}
        >
          Delete
        </button>
      </div>
    </div>
  )}
</section>


          <div className="studio-grid">
            <section className="settings-column">
              <div className="section-heading">
                <span className="number-badge">01</span>
                <div><h2>Your content</h2><p>Choose a language and add your words.</p></div>
              </div>

              <div className="panel-card">
                <label className="field-label"><Globe2 size={16} /> Video language</label>
                <div className="language-grid">
                  {languages.slice(0, 8).map(item => (
                    <button key={item} type="button" className={`language-chip ${language === item ? 'selected' : ''}`} onClick={() => changeLanguage(item)}>
                      {language === item && <Check size={13} />}{item}
                    </button>
                  ))}
                </div>
                <div className="select-wrap">
                  <Languages size={16} />
                  <select value={language} onChange={event => changeLanguage(event.target.value)} aria-label="Choose video language">
                    {languages.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <ChevronDown size={15} />
                </div>

                <div className="language-controls">
                  <div className="language-field">
                    <label className="field-label" htmlFor="source-language">
                      <Globe2 size={16} /> Original language
                    </label>
                    <div className="select-wrap language-select-wrap">
                      <Globe2 size={16} />
                      <select
                        id="source-language"
                        className="language-selector"
                        value={language}
                        onChange={event => changeLanguage(event.target.value)}
                      >
                        {languages.map(item => <option key={item} value={item}>{item}</option>)}
                      </select>
                      <ChevronDown size={15} />
                    </div>
                    <small className="language-field-hint">Select the language of your original words.</small>
                  </div>

                  <div className="language-field">
                    <label className="field-label" htmlFor="target-language">
                      <Languages size={16} /> Translate meanings to
                    </label>
                    <div className="select-wrap language-select-wrap">
                      <Languages size={16} />
                      <select
                        id="target-language"
                        className="translation-language-select"
                        value={targetLanguage}
                        onChange={event => setTargetLanguage(event.target.value)}
                      >
                        {languages.filter(item => item !== 'Other languages').map(item => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                      <ChevronDown size={15} />
                    </div>
                    <small className="language-field-hint">Choose the language for word meanings.</small>
                  </div>
                </div>

                <button
                  type="button"
                  className="translate-button"
                  onClick={handleTranslateWords}
                  disabled={isTranslating || words.length === 0 || language === targetLanguage}
                >
                  <Languages size={16} />
                  {isTranslating ? 'Translating…' : `Translate meanings to ${targetLanguage}`}
                </button>

                <div className="translation-note">
                  Example: “Apple” → Chinese meaning. Your original word stays unchanged.
                </div>

                <div className="field-row">
                  <label className="field-label" htmlFor="words">Your words</label>
                  <span className="word-count">{words.length} words</span>
                </div>
                <textarea
                  id="words"
                  className="words-input"
                  value={wordsText}
                  onChange={event => handleWordsChange(event.target.value)}
                  placeholder={'Enter one word per line...\nChinese example: 学习 | xuéxí | Learning'}
                  rows={6}
                />
                <p className="field-hint">Separate words with new lines or commas. For Pinyin and meaning use: Chinese | Pinyin | Meaning.</p>
                {language === 'Chinese' && (
                  <div className="language-options">
                    <div><strong>Chinese learning mode</strong><small>Show Chinese characters with Pinyin.</small></div>
                    <label className="toggle-row">
                      <input type="checkbox" checked={showPinyin} onChange={event => setShowPinyin(event.target.checked)} /> Pinyin
                    </label>
                  </div>
                )}
                <div className="language-options">
                  <div><strong>Show meanings / subtitles</strong><small>Show meanings entered after the second | symbol.</small></div>
                  <label className="toggle-row">
                    <input type="checkbox" checked={showMeaning} onChange={event => setShowMeaning(event.target.checked)} /> On
                  </label>
                </div>
              </div>

              <div className="section-heading section-gap">
                <span className="number-badge">02</span>
                <div><h2>Slide layout</h2><p>Choose how your words appear on screen.</p></div>
              </div>
              <div className="layout-options">
                <button type="button" className={`layout-card ${layout === 'four' ? 'chosen' : ''}`} onClick={() => handleLayoutChange('four')}>
                  <div className="layout-art four-art"><span>Word 1</span><span>Word 2</span><span>Word 3</span><span>Word 4</span></div>
                  <strong>4 different words</strong><small>Four cards on one slide</small>
                  {layout === 'four' && <span className="chosen-mark"><Check size={13} /></span>}
                </button>
                <button type="button" className={`layout-card ${layout === 'repeat' ? 'chosen' : ''}`} onClick={() => handleLayoutChange('repeat')}>
                  <div className="layout-art repeat-art"><span>Same word</span><span>Same word</span><span>Same word</span><span>Same word</span></div>
                  <strong>Repeat one word</strong><small>Repeat up to 4 times</small>
                  {layout === 'repeat' && <span className="chosen-mark"><Check size={13} /></span>}
                </button>
                <button type="button" className={`layout-card ${layout === 'single' ? 'chosen' : ''}`} onClick={() => handleLayoutChange('single')}>
                  <div className="layout-art single-art"><span>One Word</span></div>
                  <strong>One big word</strong><small>One focus per slide</small>
                  {layout === 'single' && <span className="chosen-mark"><Check size={13} /></span>}
                </button>
              </div>

              {layout === 'repeat' && (
                <div className="panel-card repeat-settings">
                  <div><strong>Repeat count</strong><small>How many times should the word appear?</small></div>
                  <div className="repeat-buttons">
                    {[1, 2, 3, 4].map(number => (
                      <button key={number} type="button" className={repeatCount === number ? 'selected' : ''} onClick={() => setRepeatCount(number)}>{number}×</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="section-heading section-gap">
                <span className="number-badge">03</span>
                <div><h2>Choose your vibe</h2><p>Pick a visual style for your video.</p></div>
              </div>
              <div className="template-grid">
                {templates.map(item => (
                  <button key={item.id} type="button" className={`template-card ${template === item.id ? 'template-selected' : ''}`} onClick={() => { setIsPlaying(false); setTemplate(item.id) }}>
                    <div className={`template-thumb ${item.id}`} style={{ '--accent': item.color }}>
                      <span>Rhythm</span><i /><i /><i />
                    </div>
                    <div className="template-meta"><span>{item.name}</span>{template === item.id && <Check size={15} />}</div>
                    <small>Video template</small>
                  </button>
                ))}
              </div>

              <div className="section-heading section-gap">
                <span className="number-badge">04</span>
                <div><h2>Music & timing</h2><p>Set the pace for your words.</p></div>
              </div>
              <div className="panel-card music-panel">
                <label className="field-label"><Music2 size={16} /> Background music</label>
                <label className="upload-zone">
                  <input type="file" accept="audio/*" onChange={handleAudioFileChange} />
                  <span className="upload-icon"><Upload size={19} /></span>
                  <span className="upload-copy"><strong>{audioName || 'Upload your audio'}</strong><small>{audioSrc ? 'Ready to play in the preview' : audioName ? 'Saved filename only — choose the file again to play' : 'MP3, WAV or other supported audio'}</small></span>
                  <span className="browse-button">Browse</span>
                </label>
                {audioSrc && (
                  <div className="audio-player-wrap">
                    <audio ref={audioRef} src={audioSrc} controls preload="metadata" className="audio-player" onEnded={() => { setIsPlaying(false); setActiveWordIndex(0) }} />
                    <p className="field-hint">Press Play in the preview to start the audio and word timing together.</p>
                  </div>
                )}
                <MusicDiscovery onSelectTrack={handleSelectMusicTrack} selectedTrackId={selectedMusicTrackId} />
                <div className="timing-grid">
                  <div>
                    <label className="field-label" htmlFor="bpm">Target BPM</label>
                    <div className="bpm-control">
                      <input id="bpm" type="number" min="40" max="240" value={bpm} onChange={event => { setIsPlaying(false); setBpm(Math.max(40, Math.min(240, Number(event.target.value) || 40))) }} />
                      <span>BPM</span>
                    </div>
                  </div>
                  <div>
                    <label className="field-label" htmlFor="timing">Word timing</label>
                    <div className="select-wrap">
                      <select id="timing" value={timing} onChange={event => { setIsPlaying(false); setTiming(event.target.value) }}>
                        <option>1 beat</option><option>2 beats</option><option>4 beats</option><option>Custom</option>
                      </select>
                      <ChevronDown size={15} />
                    </div>
                  </div>
                </div>
                <p className="field-hint">Automatic beat detection will be connected later.</p>
              </div>
            </section>

            <aside className="preview-column">
              <div className="preview-heading">
                <div><h2>Live preview</h2><p>See your layout update instantly.</p></div>
                <span className="live-pill"><i /> LIVE</span>
              </div>

              <div ref={previewRef} className={`video-preview template-${template}`}>
                <div className="preview-topline">
                  <span>YUEBEAT <b>AI</b></span>
                  <span>SLIDE {words.length ? currentSlide + 1 : 0} / {totalSlides}</span>
                </div>
                <div className={`preview-words ${layout}`}>
                  {previewWords.map((word, index) => (
                    <div key={`${currentSlide}-${index}-${word.text}`} className={`preview-word ${((isPlaying || isExporting) ? index === activeWordIndex : index === previewWords.length - 1) ? 'highlighted' : ''}`}>
                      <span>{word.text}</span>
                      {language === 'Chinese' && showPinyin && word.pronunciation && (
                        <small className="preview-pronunciation">{word.pronunciation}</small>
                      )}
                      {showMeaning && word.meaning && (
                        <span className="preview-translation">{word.meaning}</span>
                      )}
                    </div>
                  ))}
                  {words.length === 0 && <div className="preview-word"><span>Add your words</span></div>}
                </div>
                <div className="preview-bottomline"><span>{language.toUpperCase()}</span><span>{bpm} BPM</span></div>
              </div>

              <div className="preview-controls">
                <button type="button" className="round-play" onClick={goToPreviousSlide} disabled={currentSlide === 0 || words.length === 0 || isPlaying} aria-label="Previous slide">Previous</button>
                <button type="button" className="round-play playback-button" onClick={handlePlaybackToggle} disabled={words.length === 0} aria-label={isPlaying ? 'Pause preview' : 'Play preview'}>
                  {isPlaying ? <><Pause size={15} /> Pause</> : <><Play size={15} /> Play</>}
                </button>
                <div className="preview-track"><div style={{ width: `${totalSlides ? ((currentSlide + 1) / totalSlides) * 100 : 0}%` }} /></div>
                <span>{totalSlides === 0 ? 0 : currentSlide + 1}/{totalSlides}</span>
                <button type="button" className="round-play" onClick={goToNextSlide} disabled={currentSlide >= totalSlides - 1 || words.length === 0 || isPlaying} aria-label="Next slide">Next</button>
              </div>
              <p className="field-hint playback-hint">
                {isPlaying ? `Playing · word highlight every ${(wordDurationMs / 1000).toFixed(2)} seconds` : `Preview timing: ${timing} at ${bpm} BPM`}
              </p>

              <div className="preview-info">
                <div className="info-icon"><Repeat2 size={17} /></div>
                <div>
                  <strong>{layout === 'four' ? '4-word grid' : layout === 'repeat' ? `${repeatCount}× word repetition` : 'Single-word focus'}</strong>
                  <p>{layout === 'four' ? 'Four different words share one slide.' : layout === 'repeat' ? 'The same word repeats on the slide.' : 'One large word takes the spotlight.'}</p>
                </div>
              </div>

              <div className="summary-card">
                <h3><Settings2 size={16} /> Video summary</h3>
                <div><span>Language</span><strong>{language}</strong></div>
                <div><span>Words entered</span><strong>{words.length}</strong></div>
                <div><span>Total slides</span><strong>{totalSlides}</strong></div>
                <div><span>Current slide</span><strong>{words.length ? currentSlide + 1 : 0}</strong></div>
                <div><span>Template</span><strong>{activeTemplate.name}</strong></div>
                <div><span>Word timing</span><strong>{timing}</strong></div>
                <div><span>Audio</span><strong>{audioSrc ? 'Loaded' : audioName ? 'Re-upload required' : 'Not added'}</strong></div>

                <div
                  className="export-settings"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                    marginTop: 16,
                    alignItems: 'start',
                  }}
                >
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, color: '#9295aa', fontSize: 10 }}>
                    Download mode
                    <select
                      value={exportAspect}
                      onChange={event => setExportAspect(event.target.value)}
                      disabled={isExporting}
                      style={{ width: '100%', minWidth: 0, padding: '9px 8px', borderRadius: 8, border: '1px solid #303246', background: '#10121b', color: '#e6e5f2' }}
                    >
                      <option value="vertical">Mobile · 9:16</option>
                      <option value="landscape">Desktop · 16:9</option>
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, color: '#9295aa', fontSize: 10 }}>
                    Resolution
                    <select
                      value={exportResolution}
                      onChange={event => setExportResolution(event.target.value)}
                      disabled={isExporting}
                      style={{ width: '100%', minWidth: 0, padding: '9px 8px', borderRadius: 8, border: '1px solid #303246', background: '#10121b', color: '#e6e5f2' }}
                    >
                      <option value="720p">HD · 720p</option>
                      <option value="1080p">Full HD · 1080p</option>
                      <option value="4K">Ultra HD · 4K</option>
                    </select>
                  </label>

                  <label style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 6, color: '#9295aa', fontSize: 10 }}>
                    Export quality
                    <select
                      value={exportQuality}
                      onChange={event => setExportQuality(event.target.value)}
                      disabled={isExporting}
                      style={{ width: '100%', minWidth: 0, padding: '9px 8px', borderRadius: 8, border: '1px solid #303246', background: '#10121b', color: '#e6e5f2' }}
                    >
                      <option value="standard">Standard · Faster, smaller file</option>
                      <option value="high">High · Balanced quality</option>
                      <option value="maximum">Maximum · Best quality, slower</option>
                    </select>
                  </label>
                </div>

                 <div className="export-project-name">
              <span className="export-project-label">EXPORTING PROJECT</span>
             <strong>{projectTitle.trim() || "Untitled Project"}</strong>
             </div>
                  
           
<button
  type="button"
  className="export-button"
  onClick={handleExportVideo}
  disabled={isExporting || projectBusy}
>
  <Sparkles size={17} />
  {isExporting ? `Exporting ${exportProgress}%` : "Export MP4"}
  <span>{isExporting ? "…" : "→"}</span>
</button>

{isExporting && (
  <>
    <div className="preview-track export-progress">
      <div style={{ width: `${exportProgress}%` }} />
    </div>

    <button
      type="button"
      className="export-cancel-button"
      onClick={handleCancelExport}
    >
      Cancel Export
    </button>
  </>
)}

<p className="export-note">
  {isExporting
    ? "Keep this tab open while your video is being rendered."
    : audioSrc
      ? "Exports your selected template with the uploaded audio."
      : "Exports your selected template as a silent MP4."}
</p>
</div>

<div className="tip-card">
  <Sparkles size={17} />
  <p>
    <strong>Creator tip</strong>
    <br />
    Clear words and consistent timing help make rhythm-based videos easier to follow.
  </p>
</div>
</aside>
</div>

<footer className="footer">
  <span>YueBeat AI · Words Meet Rhythm</span>
  <span>Browser-rendered MP4 export · YueBeat AI</span>
</footer>
</div>
</section>
</main>
)
}

