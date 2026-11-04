
/*
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
).replace(/\/+$/, '')

const API_URL = `${API_BASE_URL}/api`

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  const result = await response.json().catch(() => ({}))

  if (!response.ok || !result.success) {
    throw new Error(result.message || `Request failed (${response.status})`)
  }

  return result
}

export async function saveProject(projectData) {
  const result = await apiRequest('/projects', {
    method: 'POST',
    body: JSON.stringify(projectData),
  })

  return result.project
}

export async function getProjects() {
  const result = await apiRequest('/projects')
  return result.projects
}

export async function getProjectById(id) {
  const result = await apiRequest(
    `/projects/${encodeURIComponent(id)}`
  )

  return result.project
}

export async function updateProject(id, projectData) {
  const result = await apiRequest(
    `/projects/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(projectData),
    }
  )

  return result.project
}

export async function deleteProject(id) {
  const result = await apiRequest(
    `/projects/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  )

  return result
}
 */

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
).replace(/\/+$/, '')

const API_URL = `${API_BASE_URL}/api`

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.success) {
    throw new Error(result.message || `Request failed (${response.status})`)
  }
  return result
}

export async function saveProject(projectData) {
  const result = await apiRequest('/projects', { method: 'POST', body: JSON.stringify(projectData) })
  return result.project
}
export async function getProjects() {
  const result = await apiRequest('/projects')
  return result.projects
}
export async function getProjectById(id) {
  const result = await apiRequest(`/projects/${encodeURIComponent(id)}`)
  return result.project
}
export async function updateProject(id, projectData) {
  const result = await apiRequest(`/projects/${encodeURIComponent(id)}`, {
    method: 'PUT', body: JSON.stringify(projectData),
  })
  return result.project
}
export async function deleteProject(id) {
  return apiRequest(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
export async function translateWords(texts, targetLanguage) {
  return apiRequest('/translation/translate', {
    method: 'POST', body: JSON.stringify({ texts, targetLanguage }),
  })
}
