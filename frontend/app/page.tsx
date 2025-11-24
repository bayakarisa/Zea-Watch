'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { UploadCard } from '@/components/UploadCard'
import { ScanHistoryCard } from '@/components/ScanHistoryCard'
import { AnalysisResult as AnalysisResultComponent } from '@/components/AnalysisResult'
import { Button } from '@/components/ui/button'
import { Leaf, History } from 'lucide-react'
import { AnalysisResult } from '@/utils/api'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'

export default function Home() {
  const router = useRouter()
  const [refreshKey, setRefreshKey] = useState(0)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const { user } = useAuth()

  // Remove the useEffect that uses supabase.auth.getUser
  /*
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])
  */

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setAnalysisResult(result)
    // Refresh the history card to show the new result
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="bg-card rounded-xl p-8 mb-8 shadow-sm border">
          <div className="flex items-start gap-3 mb-4">
            <Leaf className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Detect maize leaf diseases instantly using AI
              </h1>
              <p className="text-lg text-muted-foreground mb-4">
                Empower your farming with cutting-edge AI. Simply upload or capture a photo of a maize leaf,
                and ZeaWatch will intelligently analyze it for potential diseases. Get instant, actionable insights,
                detailed descriptions, and tailored recommendations to safeguard your harvest and promote crop health.
              </p>
            </div>
          </div>
        </div>

        {/* Analysis Result */}
        {analysisResult && (
          <div className="mb-6">
            <AnalysisResultComponent
              result={analysisResult}
              onClose={() => setAnalysisResult(null)}
            />
          </div>
        )}

        {/* Upload/Capture Section */}
        <div className="mb-8">
          <UploadCard onAnalysisComplete={handleAnalysisComplete} />
        </div>

        {/* View History Button (only visible if logged in) */}
        {user && (
          <div className="mb-8 flex justify-center">
            <Button asChild variant="outline" size="lg">
              <Link href="/history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                View My History
              </Link>
            </Button>
          </div>
        )}

        {/* Recent History (Guest Mode) */}
        {!user && (
          <div className="mb-8">
            <ScanHistoryCard key={refreshKey} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

