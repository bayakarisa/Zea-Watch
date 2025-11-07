import axios from 'axios'

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

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
}

export const analyzeImage = async (imageFile: File): Promise<AnalysisResult> => {
  const formData = new FormData()
  formData.append('image', imageFile)

  try {
    const response = await api.post<AnalysisResult>('/api/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 second timeout for model loading
    })

    return response.data
  } catch (error: any) {
    if (error.response) {
      // Server responded with error
      const errorMessage = error.response.data?.error || error.response.data?.message || 'Failed to analyze image'
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

export const getHistory = async (): Promise<AnalysisResult[]> => {
  const response = await api.get<AnalysisResult[]>('/api/history')
  return response.data
}

export const deleteHistoryItem = async (id: string): Promise<void> => {
  await api.delete(`/api/history/${id}`)
}

