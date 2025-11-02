'use client'

import React, { useState } from 'react'
import { Header } from '@/components/Header'
import { UploadCard } from '@/components/UploadCard'
import { ScanHistoryCard } from '@/components/ScanHistoryCard'
import { AnalysisResult as AnalysisResultComponent } from '@/components/AnalysisResult'
import { Leaf } from 'lucide-react'
import { AnalysisResult } from '@/utils/api'

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setAnalysisResult(result)
    // Refresh the history card to show the new result
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-[#f0f7f0]">
      <Header />
      
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Welcome Section */}
        <div className="bg-[#e8f5e9] rounded-xl p-8 mb-8 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <Leaf className="h-6 w-6 text-[#2e7d32] flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-3xl font-bold text-[#1e5f2e] mb-2">
                Welcome to ZeaWatch!
              </h2>
              <p className="text-xl text-[#1e5f2e] mb-4 font-medium">
                AI-Powered Maize Disease Detection
              </p>
              <p className="text-gray-700 leading-relaxed">
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

        {/* Main Content Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UploadCard onAnalysisComplete={handleAnalysisComplete} />
          <ScanHistoryCard key={refreshKey} />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-6 text-center text-sm text-gray-600">
        <p>© 2025 ZeaWatch. Built for healthier crops.</p>
      </footer>
    </div>
  )
}

