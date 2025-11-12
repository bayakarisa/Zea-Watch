'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Leaf, Trash2, CheckCircle2, AlertTriangle, XOctagon } from 'lucide-react'
import { getHistory, deleteHistoryItem, AnalysisResult, API_URL } from '@/utils/api'
import { Button } from './ui/button'
import { ProgressBar } from './ui/ProgressBar'
import { Badge } from './ui/Badge'
import { Tooltip } from './ui/tooltip'
import Image from 'next/image'

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
                    <div className="relative w-24 h-24 rounded-md overflow-hidden flex-shrink-0">
                      <Image
                        src={item.image_url.startsWith('http') ? item.image_url : `${API_URL}${item.image_url}`}
                        alt="Maize leaf"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-800">{item.disease}</h3>
                        {(() => {
                          const confidencePercent = Math.round(item.confidence * 100)
                          let confidenceLevel: 'high' | 'moderate' | 'low'
                          let color: 'green' | 'yellow' | 'red'
                          let icon = null
                          let explanation = ''
                          if (confidencePercent >= 80) {
                            confidenceLevel = 'high'
                            color = 'green'
                            icon = <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="High confidence" />
                            explanation = "We're very confident about this diagnosis"
                          } else if (confidencePercent >= 50) {
                            confidenceLevel = 'moderate'
                            color = 'yellow'
                            icon = <AlertTriangle className="h-4 w-4 text-yellow-500" aria-label="Moderate confidence" />
                            explanation = "This diagnosis is likely, but consider getting a second opinion"
                          } else {
                            confidenceLevel = 'low'
                            color = 'red'
                            icon = <XOctagon className="h-4 w-4 text-red-600" aria-label="Low confidence" />
                            explanation = "Uncertain diagnosis. We recommend consulting an expert"
                          }
                          return (
                            <Tooltip content="Confidence indicates how certain the AI is about this diagnosis">
                              <div className="flex items-center gap-2 mt-1" tabIndex={0} aria-label={`Confidence: ${confidencePercent}% (${confidenceLevel})`}>
                                <Badge color={color} className="text-xs px-2 py-0.5">
                                  {icon}
                                  <span className="ml-1 font-semibold capitalize">{confidenceLevel}</span>
                                </Badge>
                                <span className="text-gray-700 font-medium text-xs">{confidencePercent}%</span>
                              </div>
                            </Tooltip>
                          )
                        })()}
                        {(() => {
                          const confidencePercent = Math.round(item.confidence * 100)
                          let color: 'green' | 'yellow' | 'red'
                          if (confidencePercent >= 80) color = 'green'
                          else if (confidencePercent >= 50) color = 'yellow'
                          else color = 'red'
                          return (
                            <div className="mt-1" aria-label={`Confidence progress bar: ${confidencePercent}%`}>
                              <ProgressBar value={confidencePercent} color={color} />
                            </div>
                          )
                        })()}
                        {(() => {
                          const confidencePercent = Math.round(item.confidence * 100)
                          let explanation = ''
                          if (confidencePercent >= 80) explanation = "We're very confident about this diagnosis"
                          else if (confidencePercent >= 50) explanation = "This diagnosis is likely, but consider getting a second opinion"
                          else explanation = "Uncertain diagnosis. We recommend consulting an expert"
                          return (
                            <div className="mt-1 text-xs text-gray-700" aria-live="polite">{explanation}</div>
                          )
                        })()}
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

