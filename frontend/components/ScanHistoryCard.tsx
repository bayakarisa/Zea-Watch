'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Leaf, Trash2 } from 'lucide-react'
import { getHistory, deleteHistoryItem, AnalysisResult } from '@/utils/api'
import { Button } from './ui/button'

export const ScanHistoryCard: React.FC = () => {
  const [history, setHistory] = useState<AnalysisResult[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchHistory = async () => {
    try {
      setIsLoading(true)
      const data = await getHistory()
      setHistory(data)
    } catch (error) {
      console.error('Failed to fetch history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      await deleteHistoryItem(id)
      setHistory(history.filter(item => item.id !== id))
    } catch (error) {
      console.error('Failed to delete:', error)
      alert('Failed to delete item')
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-gray-800">Scan History</CardTitle>
        <CardDescription className="text-gray-600">
          Review your previous analysis results.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <Leaf className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-700 mb-2 font-medium">No Scan History Yet</p>
            <p className="text-sm text-gray-500">
              Your analyzed maize leaf images will appear here. Start by uploading or capturing an image!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex gap-4">
                  {item.image_url && (
                    <div className="relative w-24 h-24 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                      <img
                        src={item.image_url}
                        alt="Maize leaf"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{item.disease}</h3>
                        <p className="text-sm text-muted-foreground">
                          Confidence: {typeof item.confidence === 'number' 
                            ? (item.confidence <= 1 ? (item.confidence * 100).toFixed(1) : item.confidence.toFixed(1))
                            : item.confidence}%
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => item.id && handleDelete(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    <p className="text-xs text-gray-500">
                      <strong>Recommendation:</strong> {item.recommendation}
                    </p>
                    {item.created_at && (
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

