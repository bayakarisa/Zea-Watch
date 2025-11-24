import { supabase } from './supabaseClient'

export interface UserProfile {
  id: string
  email: string
  name: string | null
  location: string | null
  subscription_tier: string
  created_at: string
}

// Backend API URL
// Force 127.0.0.1 to avoid localhost IPv6 issues
const API_URL = 'http://127.0.0.1:5000/api'

/**
 * Sign up a new user with email and password
 */
export async function signUp(email: string, password: string, name: string) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      email,
      password,
      preferredLanguage: 'en',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Registration failed')
  }

  return await response.json()
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string, rememberMe: boolean = false) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for cookies
    body: JSON.stringify({
      email,
      password,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Login failed')
  }

  const data = await response.json()

  // Store access token in localStorage
  if (data.access_token) {
    localStorage.setItem('auth_token', data.access_token)
  }

  const token = localStorage.getItem('auth_token')

  if (!token) return null

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      localStorage.removeItem('auth_token')
      return null
    }

    const userData = await response.json()
    return userData.user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Get the current session
 */
export async function getCurrentSession(): Promise<any | null> {
  const token = localStorage.getItem('auth_token')
  return token ? { auth_token: token } : null
}

/**
 * Get user profile from the users table
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const token = localStorage.getItem('auth_token')

  if (!token) return null

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) return null

    const data = await response.json()
    return data.user
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Change user password
 */
export async function changePassword(newPassword: string) {
  const token = localStorage.getItem('auth_token')

  if (!token) throw new Error('Not authenticated')

  const response = await fetch(`${API_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ password: newPassword }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to change password')
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string) {
  const response = await fetch(`${API_URL}/auth/forgot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to send reset email')
  }
}

/**
 * Delete user account
 */
export async function deleteAccount(userId: string) {
  const token = localStorage.getItem('auth_token')

  if (!token) throw new Error('Not authenticated')

  // Delete user profile (this should be done via your backend)
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)

  if (error) throw error
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: any | null) => void) {
  // Simple implementation - check token on interval
  const checkAuth = async () => {
    const session = await getCurrentSession()
    callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session)
  }

  checkAuth()

  // Check every 5 minutes
  const interval = setInterval(checkAuth, 5 * 60 * 1000)

  return {
    data: { subscription: { unsubscribe: () => clearInterval(interval) } }
  }
}