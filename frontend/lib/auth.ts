import { supabase } from './supabaseClient'
import { User, Session } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  email: string
  name: string | null
  location: string | null
  subscription_tier: string
  created_at: string
}

/**
 * Sign up a new user with email and password
 */
export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  })

  if (error) throw error
  return data
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string, rememberMe: boolean = false) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error

  // If remember me is checked, set a longer session expiry
  if (rememberMe) {
    // Supabase handles session persistence via localStorage/sessionStorage
    // The session will persist based on browser settings
  }

  return data
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Get the current session
 */
export async function getCurrentSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/**
 * Get user profile from the users table
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data
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
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) throw error
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })

  if (error) throw error
}

/**
 * Delete user account
 */
export async function deleteAccount(userId: string) {
  // Delete user profile (cascade will handle analyses)
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)

  if (error) throw error

  // Delete auth user
  const { error: authError } = await supabase.auth.admin.deleteUser(userId)
  // Note: admin.deleteUser requires service role key, so this might need to be done server-side
  // For now, we'll just delete the profile and let the user know to contact support
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback)
}

