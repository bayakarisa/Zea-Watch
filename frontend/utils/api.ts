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

  const response = await api.post<AnalysisResult>('/api/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

export const getHistory = async (): Promise<AnalysisResult[]> => {
  const response = await api.get<AnalysisResult[]>('/api/history')
  return response.data
}

export const deleteHistoryItem = async (id: string): Promise<void> => {
  await api.delete(`/api/history/${id}`)
}

