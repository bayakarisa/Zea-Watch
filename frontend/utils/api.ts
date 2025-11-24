import axios from 'axios'
import { supabase } from '@/lib/supabaseClient'

// Force 127.0.0.1 to avoid localhost IPv6 issues
const API_URL = 'http://127.0.0.1:5000/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface AnalysisResult {
  id?: string
  disease: string
  confidence: number
  description: string
  recommendation: string
  image_url?: string
  created_at?: string
  user_id?: string
  notes?: string
  latitude?: number
  longitude?: number
  field_name?: string
  location_accuracy?: string
}

export interface LocationData {
  latitude: number
  longitude: number
  accuracy?: number
}

/**
 * Get user's current location
 */
export const getCurrentLocation = (): Promise<LocationData> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      (error) => {
        reject(error)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  })
}

/**
 * Upload image to Supabase Storage
 */
export const uploadImageToStorage = async (
  file: File,
  userId: string | null
): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = userId ? `users/${userId}/${fileName}` : `guests/${fileName}`

    const { data, error } = await supabase.storage
      .from('leaf-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) throw error

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('leaf-images')
      .getPublicUrl(data.path)

    return urlData.publicUrl
  } catch (error: any) {
    console.error('Error uploading image:', error)
    throw new Error('Failed to upload image to storage')
  }
}

/**
 * Analyze image using backend API
 */
/**
 * Analyze image using backend API
 */
export const analyzeImage = async (
  imageFile: File,
  locationData?: LocationData,
  fieldName?: string
): Promise<AnalysisResult> => {
  const formData = new FormData()
  formData.append('image', imageFile)

  // Get auth token from local storage
  const token = localStorage.getItem('auth_token')
  const headers: Record<string, string> = {
    'Content-Type': 'multipart/form-data',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    // Call backend API for analysis
    const response = await api.post<AnalysisResult>('/analyze', formData, {
      headers,
      timeout: 60000, // 60 second timeout for model loading
    })

    const result = response.data

    // If user is guest, save to local storage
    // Backend handles saving for authenticated users
    if (!token) {
      try {
        // Convert confidence for guest mode
        const confidenceValue =
          result.confidence <= 1 ? result.confidence * 100 : result.confidence

        const guestAnalyses = JSON.parse(
          localStorage.getItem('zeawatch_guest_analyses') || '[]'
        )
        guestAnalyses.push({
          ...result,
          confidence: confidenceValue,
          latitude: locationData?.latitude || null,
          longitude: locationData?.longitude || null,
          field_name: fieldName || null,
          created_at: new Date().toISOString(),
        })
        localStorage.setItem('zeawatch_guest_analyses', JSON.stringify(guestAnalyses))
      } catch (error) {
        console.error('Error saving to local storage:', error)
      }
    }

    // Convert confidence for return value
    const confidenceValue =
      result.confidence <= 1 ? result.confidence * 100 : result.confidence

    return { ...result, confidence: confidenceValue }
  } catch (error: any) {
    if (error.response) {
      // Server responded with error
      const errorMessage =
        error.response.data?.error ||
        error.response.data?.message ||
        'Failed to analyze image'
      console.error(`API Error (${error.config?.url}):`, errorMessage)
      throw new Error(errorMessage)
    } else if (error.request) {
      // Request made but no response
      throw new Error('No response from server. Please check if backend is running.')
    } else {
      // Error setting up request
      throw new Error(error.message || 'Failed to analyze image')
    }
  }
}

/**
 * Get analysis history from Supabase or local storage
 */
export const getHistory = async (): Promise<AnalysisResult[]> => {
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Fetch from Supabase
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching history:', error)
      return []
    }

    return data || []
  } else {
    // Fetch from local storage
    try {
      const guestAnalyses = JSON.parse(
        localStorage.getItem('zeawatch_guest_analyses') || '[]'
      )
      return guestAnalyses
    } catch (error) {
      console.error('Error reading from local storage:', error)
      return []
    }
  }
}

/**
 * Delete analysis item
 */
export const deleteHistoryItem = async (id: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { error } = await supabase.from('analyses').delete().eq('id', id).eq('user_id', user.id)
    if (error) throw error
  } else {
    // Delete from local storage
    try {
      const guestAnalyses = JSON.parse(
        localStorage.getItem('zeawatch_guest_analyses') || '[]'
      )
      const updated = guestAnalyses.filter((a: AnalysisResult) => a.id !== id)
      localStorage.setItem('zeawatch_guest_analyses', JSON.stringify(updated))
    } catch (error) {
      console.error('Error deleting from local storage:', error)
      throw error
    }
  }
}

/**
 * Migrate guest analyses to Supabase when user signs up
 */
export const migrateGuestAnalyses = async (userId: string): Promise<void> => {
  try {
    const guestAnalyses = JSON.parse(
      localStorage.getItem('zeawatch_guest_analyses') || '[]'
    )

    if (guestAnalyses.length === 0) return

    // Upload all guest analyses to Supabase
    const analysesToInsert = guestAnalyses.map((analysis: AnalysisResult) => {
      // Ensure confidence is in 0-100 range
      const confidenceValue =
        analysis.confidence <= 1 ? analysis.confidence * 100 : analysis.confidence

      return {
        user_id: userId,
        disease: analysis.disease,
        confidence: confidenceValue,
        description: analysis.description,
        recommendation: analysis.recommendation,
        image_url: analysis.image_url,
        latitude: analysis.latitude,
        longitude: analysis.longitude,
        field_name: analysis.field_name,
        location_accuracy: analysis.location_accuracy,
        created_at: analysis.created_at || new Date().toISOString(),
      }
    })

    const { error } = await supabase.from('analyses').insert(analysesToInsert)

    if (error) {
      console.error('Error migrating guest analyses:', error)
      throw error
    }

    // Clear local storage after successful migration
    localStorage.removeItem('zeawatch_guest_analyses')
  } catch (error) {
    console.error('Error migrating guest analyses:', error)
    throw error
  }
}

