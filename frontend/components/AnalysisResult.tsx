'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { AnalysisResult as AnalysisResultType } from '@/utils/api'
import { CheckCircle2, XCircle, AlertTriangle, XOctagon } from 'lucide-react'
import { Button } from './ui/button'
import { ProgressBar } from './ui/ProgressBar'
import { Badge } from './ui/Badge'
import { Tooltip } from './ui/tooltip'

interface AnalysisResultProps {
  result: AnalysisResultType
  onClose: () => void
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ result, onClose }) => {
  // Calculate confidence details
  const confidencePercent = Math.round(result.confidence * 100)
  let confidenceLevel: 'high' | 'moderate' | 'low'
  let color: 'green' | 'yellow' | 'red'
  let icon = null
  let explanation = ''
  if (confidencePercent >= 80) {
    confidenceLevel = 'high'
    color = 'green'
    icon = <CheckCircle2 className="h-5 w-5 text-green-600" aria-label="High confidence" />
    explanation = "We're very confident about this diagnosis"
  } else if (confidencePercent >= 50) {
    confidenceLevel = 'moderate'
    color = 'yellow'
    icon = <AlertTriangle className="h-5 w-5 text-yellow-500" aria-label="Moderate confidence" />
    explanation = "This diagnosis is likely, but consider getting a second opinion"
  } else {
    confidenceLevel = 'low'
    color = 'red'
    icon = <XOctagon className="h-5 w-5 text-red-600" aria-label="Low confidence" />
    explanation = "Uncertain diagnosis. We recommend consulting an expert"
  }

  return (
    <Card className="w-full border-primary border-2">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-primary mb-2">Analysis Complete</CardTitle>
            <Tooltip content="Confidence indicates how certain the AI is about this diagnosis">
              <div className="flex items-center gap-2 mt-1" tabIndex={0} aria-label={`Confidence: ${confidencePercent}% (${confidenceLevel})`}>
                <Badge color={color} className="text-base px-3 py-1">
                  {icon}
                  <span className="ml-1 font-semibold capitalize">{confidenceLevel}</span>
                </Badge>
                <span className="text-gray-700 font-medium text-base">{confidencePercent}%</span>
              </div>
            </Tooltip>
            <div className="mt-2" aria-label={`Confidence progress bar: ${confidencePercent}%`}>
              <ProgressBar value={confidencePercent} color={color} label="Confidence" />
            </div>
            <div className="mt-2 text-sm text-gray-700" aria-live="polite">{explanation}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close analysis result">
            <XCircle className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
          <span aria-hidden="true">{icon}</span>
          <div>
            <h3 className="font-semibold text-gray-800 text-lg">{result.disease}</h3>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Description</h4>
          <p className="text-sm text-gray-600 leading-relaxed">{result.description}</p>
        </div>

        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Recommendations</h4>
          <div className="text-sm text-gray-600 whitespace-pre-line">{result.recommendation}</div>
        </div>
      </CardContent>
    </Card>
  )
}

