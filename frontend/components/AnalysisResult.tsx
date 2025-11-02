'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { AnalysisResult as AnalysisResultType } from '@/utils/api'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from './ui/button'

interface AnalysisResultProps {
  result: AnalysisResultType
  onClose: () => void
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ result, onClose }) => {
  return (
    <Card className="w-full border-primary border-2">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-primary mb-2">Analysis Complete</CardTitle>
            <p className="text-sm text-gray-600">
              Confidence: <strong>{(result.confidence * 100).toFixed(1)}%</strong>
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XCircle className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
          <CheckCircle2 className="h-6 w-6 text-primary" />
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

