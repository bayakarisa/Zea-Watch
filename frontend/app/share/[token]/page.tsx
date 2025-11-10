'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabaseClient'
import { Loader2, AlertCircle } from 'lucide-react'

interface SharedAnalysis {
  id: string
  disease: string
  confidence: number
  description: string
  recommendation: string
  image_url: string | null
  field_name: string | null
  created_at: string
}

export default function SharePage() {
  const params = useParams()
  const token = params.token as string
  const [analysis, setAnalysis] = useState<SharedAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSharedAnalysis = async () => {
      try {
        // Get shared analysis by token
        const { data: sharedData, error: sharedError } = await supabase
          .from('shared_analyses')
          .select('analysis_id, expires_at')
          .eq('share_token', token)
          .single()

        if (sharedError || !sharedData) {
          setError('Share link not found or expired')
          setLoading(false)
          return
        }

        // Check if expired
        if (sharedData.expires_at && new Date(sharedData.expires_at) < new Date()) {
          setError('This share link has expired')
          setLoading(false)
          return
        }

        // Get the analysis (RLS policy allows public read for shared analyses)
        const { data: analysisData, error: analysisError } = await supabase
          .from('analyses')
          .select('*')
          .eq('id', sharedData.analysis_id)
          .single()

        if (analysisError || !analysisData) {
          setError('Analysis not found')
          setLoading(false)
          return
        }

        setAnalysis(analysisData)
      } catch (err: any) {
        console.error('Error fetching shared analysis:', err)
        setError('Failed to load shared analysis')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchSharedAnalysis()
    }
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">{error || 'Analysis not found'}</p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>{analysis.disease}</CardTitle>
            <CardDescription>
              Shared Analysis • {new Date(analysis.created_at).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {analysis.image_url && (
              <div className="relative w-full h-96 bg-muted rounded-md overflow-hidden">
                <img
                  src={analysis.image_url}
                  alt={analysis.disease}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold mb-2">Confidence</h3>
              <p className="text-2xl font-bold text-primary">{analysis.confidence.toFixed(1)}%</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{analysis.description}</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Recommendation</h3>
              <p className="text-muted-foreground">{analysis.recommendation}</p>
            </div>

            {analysis.field_name && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Field</h3>
                <p className="text-muted-foreground">{analysis.field_name}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}

