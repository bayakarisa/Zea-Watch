'use client'

// Force 127.0.0.1 to avoid localhost IPv6 issues
const API_BASE = 'http://127.0.0.1:5000/api'
console.log('Dashboard API_BASE:', API_BASE)

interface FetchOptions extends RequestInit {
  skipAuth?: boolean
}

async function authFetch(path: string, options: FetchOptions = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  const headers = new Headers(options.headers || {})

  if (!options.skipAuth) {
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    } else {
      throw new Error('Not authenticated')
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (!response.ok) {
    let message = 'Request failed'
    try {
      const error = await response.json()
      message = error.message || error.code || message
    } catch {
      message = response.statusText || message
    }
    throw new Error(message)
  }

  if (response.status === 204) return null
  return response.json()
}

export async function fetchUploads() {
  return authFetch('/uploads')
}

export async function uploadFile(formData: FormData) {
  const token = localStorage.getItem('auth_token')
  if (!token) throw new Error('Not authenticated')

  const response = await fetch(`${API_BASE}/uploads`, {
    method: 'POST',
    body: formData,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || 'Upload failed')
  }

  return response.json()
}

export async function deleteUpload(uploadId: string) {
  return authFetch(`/uploads/${uploadId}`, { method: 'DELETE' })
}

export async function fetchRecommendations() {
  return authFetch('/recommendations')
}

