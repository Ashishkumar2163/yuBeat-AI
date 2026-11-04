require('dotenv').config({ path: require('path').join(__dirname, '.env') })

const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const Project = require('./models/project')
const musicRoutes = require('./routes/musicRoutes')

const app = express()

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://trjpt47k-5173.inc1.devtunnels.ms',
]

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error(`CORS blocked origin: ${origin}`))
  },
}))
app.use(express.json({ limit: '1mb' }))

// Keep the existing music router and all its endpoints mounted.
app.use('/api/music', musicRoutes)

app.get('/', (_req, res) => {
  res.json({ success: true, message: 'YueBeat AI backend is running!' })
})

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  })
})

const LANGUAGE_CODES = {
  English: 'en', Hindi: 'hi', Chinese: 'zh', Japanese: 'ja',
  Korean: 'ko', German: 'de', French: 'fr', Marathi: 'mr',
  Spanish: 'es', Arabic: 'ar', Bengali: 'bn', Tamil: 'ta',
  Portuguese: 'pt', auto: 'auto',
}

function languageCode(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} is required.`)
  }
  const clean = value.trim()
  return LANGUAGE_CODES[clean] || clean.toLowerCase()
}

function libreTranslateBase() {
  // Local Docker service is exposed on host port 5001.
  return (process.env.LIBRETRANSLATE_URL || 'http://127.0.0.1:5001')
    .trim().replace(/\/+$/, '')
}

app.get('/api/translate/health', async (_req, res) => {
  try {
    const response = await fetch(`${libreTranslateBase()}/languages`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) {
      return res.status(503).json({
        success: false,
        translation: 'unavailable',
        message: `Local LibreTranslate returned HTTP ${response.status}.`,
      })
    }
    const languages = await response.json()
    return res.json({
      success: true,
      translation: 'ready',
      provider: 'self-hosted LibreTranslate',
      languageCount: Array.isArray(languages) ? languages.length : 0,
    })
  } catch (error) {
    console.error('Local translation health check:', error.cause || error.message)
    return res.status(503).json({
      success: false,
      translation: 'unavailable',
      message: 'Local LibreTranslate is not running. Start its Docker container.',
    })
  }
})

app.post('/api/translate', async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage = 'auto' } = req.body || {}

    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ success: false, message: 'A non-empty text value is required.' })
    }
    if (text.length > 5000) {
      return res.status(413).json({ success: false, message: 'Please translate 5,000 characters or fewer at a time.' })
    }

    let source
    let target
    try {
      source = languageCode(sourceLanguage, 'sourceLanguage')
      target = languageCode(targetLanguage, 'targetLanguage')
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message })
    }

    if (source === target) {
      return res.json({ success: true, translatedText: text.trim(), sourceLanguage: source, targetLanguage: target })
    }

    const response = await fetch(`${libreTranslateBase()}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      // Self-hosted LibreTranslate requires no API key.
      body: JSON.stringify({ q: text.trim(), source, target, format: 'text' }),
      signal: AbortSignal.timeout(90000),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      console.error('Local LibreTranslate response:', response.status, data)
      return res.status(502).json({
        success: false,
        message: data.error || `Local translation service returned HTTP ${response.status}.`,
        providerStatus: response.status,
      })
    }
    if (typeof data.translatedText !== 'string') {
      return res.status(502).json({ success: false, message: 'Local translation service returned an unexpected response.' })
    }

    return res.json({
      success: true,
      translatedText: data.translatedText,
      sourceLanguage: source,
      targetLanguage: target,
    })
  } catch (error) {
    console.error('Translation error:', {
      name: error.name,
      message: error.message,
      cause: error.cause?.message || error.cause,
    })
    const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError'
    return res.status(timedOut ? 504 : 503).json({
      success: false,
      message: timedOut
        ? 'Local translation timed out. Wait for language models to load and retry.'
        : 'Cannot reach local LibreTranslate. Start Docker and check port 5001.',
    })
  }
})

// Existing project CRUD routes preserved.
app.post('/api/projects', async (req, res) => {
  try {
    const project = await Project.create(req.body)
    return res.status(201).json({ success: true, project })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
})

app.get('/api/projects', async (_req, res) => {
  try {
    const projects = await Project.find().sort({ updatedAt: -1 })
    return res.json({ success: true, projects })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/projects/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid project ID' })
    }
    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' })
    return res.json({ success: true, project })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
})

app.put('/api/projects/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid project ID' })
    }
    const allowedFields = [
      'title', 'language', 'targetLanguage', 'wordsText', 'layout',
      'repeatCount', 'template', 'bpm', 'timing', 'showMeaning',
      'showPinyin', 'audioName',
    ]
    const updates = {}
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) updates[field] = req.body[field]
    }
    const project = await Project.findByIdAndUpdate(
      req.params.id, { $set: updates }, { new: true, runValidators: true }
    )
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' })
    return res.json({ success: true, message: 'Project updated successfully', project })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
})

app.delete('/api/projects/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid project ID' })
    }
    const project = await Project.findByIdAndDelete(req.params.id)
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' })
    return res.json({ success: true, message: 'Project deleted successfully', projectId: project._id })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
})

const PORT = process.env.PORT || 5000

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing from server/.env')
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('MongoDB connected successfully')
    app.listen(PORT, () => {
      console.log(`YueBeat AI backend running on http://localhost:${PORT}`)
      console.log(`Self-hosted LibreTranslate: ${libreTranslateBase()}`)
    })
  } catch (error) {
    console.error('Backend startup failed:', error.message)
    process.exitCode = 1
  }
}

startServer()
