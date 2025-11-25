'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabaseClient'
import { Loader2, Share2, Download, ExternalLink, X, Filter, Calendar } from 'lucide-react'
import Image from 'next/image'
import Papa from 'papaparse'
import jsPDF from 'jspdf'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from 'react-i18next'

interface Analysis {
  id: string
  disease: string
  confidence: number
  description: string
  recommendation: string
  image_url: string | null
  notes: string | null
  field_name: string | null
  created_at: string
}

export default function HistoryPage() {
  const { t } = useTranslation('common')
  const router = useRouter()
  const { user, token: contextToken } = useAuth()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [filteredAnalyses, setFilteredAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [filters, setFilters] = useState({
    disease: '',
    field: '',
    dateFrom: '',
    dateTo: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        setLoading(true)
        const token = contextToken || localStorage.getItem('auth_token')
        const baseUrl = 'http://127.0.0.1:5000'
        const res = await fetch(`${baseUrl}/api/history`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!res.ok) throw new Error('Failed to fetch history')

        const data = await res.json()
        setAnalyses(data || [])
        setFilteredAnalyses(data || [])
      } catch (error) {
        console.error('Error fetching analyses:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchData()
    } else {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        router.push('/signin')
      }
    }
  }, [user, contextToken, router])

  useEffect(() => {
    let filtered = [...analyses]

    if (filters.disease) {
      filtered = filtered.filter((a) =>
        a.disease.toLowerCase().includes(filters.disease.toLowerCase())
      )
    }

    if (filters.field) {
      filtered = filtered.filter((a) =>
        a.field_name?.toLowerCase().includes(filters.field.toLowerCase())
      )
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(
        (a) => new Date(a.created_at) >= new Date(filters.dateFrom)
      )
    }

    if (filters.dateTo) {
      filtered = filtered.filter(
        (a) => new Date(a.created_at) <= new Date(filters.dateTo + 'T23:59:59')
      )
    }

    setFilteredAnalyses(filtered)
  }, [filters, analyses])

  const handleShare = async (analysis: Analysis) => {
    try {
      // Generate a unique token
      const token = `${analysis.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`

      // Create share record
      const { data, error } = await supabase
        .from('shared_analyses')
        .insert({
          analysis_id: analysis.id,
          share_token: token,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        })
        .select()
        .single()

      if (error) throw error

      const shareUrl = `${window.location.origin}/share/${token}`
      setShareLink(shareUrl)
      setShareDialogOpen(true)
    } catch (err: any) {
      console.error('Error creating share:', err)
      alert(t('history.share.error'))
    }
  }

  const handleExportCSV = () => {
    const csv = Papa.unparse(filteredAnalyses)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zeawatch-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPDF = async (analysis: Analysis) => {
    const pdf = new jsPDF()
    pdf.setFontSize(16)
    pdf.text(t('history.export.report_title'), 20, 20)
    pdf.setFontSize(12)
    pdf.text(`${t('history.export.disease')}: ${analysis.disease}`, 20, 35)
    pdf.text(`${t('history.export.confidence')}: ${analysis.confidence}%`, 20, 45)
    pdf.text(`${t('history.export.date')}: ${new Date(analysis.created_at).toLocaleDateString()}`, 20, 55)
    pdf.text(`${t('history.export.desc')}: ${analysis.description}`, 20, 70)
    pdf.text(`${t('history.export.rec')}: ${analysis.recommendation}`, 20, 90)
    if (analysis.field_name) {
      pdf.text(`${t('history.export.field')}: ${analysis.field_name}`, 20, 110)
    }
    pdf.save(`zeawatch-analysis-${analysis.id}.pdf`)
  }

  const getDiseaseColors = (disease: string) => {
    const colors: Record<string, string> = {
      'Northern Leaf Blight': 'bg-orange-100 text-orange-800',
      'Common Rust': 'bg-yellow-100 text-yellow-800',
      'Gray Leaf Spot': 'bg-gray-100 text-gray-800',
      'Healthy': 'bg-green-100 text-green-800',
    }
    return colors[disease] || 'bg-blue-100 text-blue-800'
  }

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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-foreground">{t('history.title')}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              {t('history.export_csv')}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('history.filters.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="disease">{t('history.filters.disease')}</Label>
                <Input
                  id="disease"
                  placeholder={t('history.filters.disease_placeholder')}
                  value={filters.disease}
                  onChange={(e) => setFilters({ ...filters, disease: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="field">{t('history.filters.field')}</Label>
                <Input
                  id="field"
                  placeholder={t('history.filters.field_placeholder')}
                  value={filters.field}
                  onChange={(e) => setFilters({ ...filters, field: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateFrom">{t('history.filters.date_from')}</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">{t('history.filters.date_to')}</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>
            </div>
            {(filters.disease || filters.field || filters.dateFrom || filters.dateTo) && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() =>
                  setFilters({ disease: '', field: '', dateFrom: '', dateTo: '' })
                }
              >
                {t('history.filters.clear')}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Analyses List */}
        {filteredAnalyses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {analyses.length === 0
                  ? t('history.empty.no_analyses')
                  : t('history.empty.no_matches')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAnalyses.map((analysis) => (
              <Card key={analysis.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{analysis.disease}</CardTitle>
                      <CardDescription>
                        {new Date(analysis.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getDiseaseColors(
                        analysis.disease
                      )}`}
                    >
                      {analysis.confidence.toFixed(1)}%
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysis.image_url && (
                    <div className="relative w-full h-48 bg-muted rounded-md overflow-hidden">
                      <img
                        src={analysis.image_url}
                        alt={analysis.disease}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {analysis.description}
                  </p>
                  {analysis.field_name && (
                    <p className="text-sm text-muted-foreground">
                      {t('history.card.field')}: {analysis.field_name}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAnalysis(analysis)}
                    >
                      {t('history.card.view_details')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShare(analysis)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportPDF(analysis)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Details Dialog */}
        <Dialog
          open={selectedAnalysis !== null}
          onOpenChange={(open) => !open && setSelectedAnalysis(null)}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedAnalysis && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedAnalysis.disease}</DialogTitle>
                  <DialogDescription>
                    {new Date(selectedAnalysis.created_at).toLocaleString()}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {selectedAnalysis.image_url && (
                    <div className="relative w-full h-64 bg-muted rounded-md overflow-hidden">
                      <img
                        src={selectedAnalysis.image_url}
                        alt={selectedAnalysis.disease}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold mb-2">{t('history.details.confidence')}: {selectedAnalysis.confidence}%</h3>
                    <p className="text-muted-foreground">{selectedAnalysis.description}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{t('history.details.recommendation')}</h3>
                    <p className="text-muted-foreground">{selectedAnalysis.recommendation}</p>
                  </div>
                  {selectedAnalysis.field_name && (
                    <div>
                      <h3 className="font-semibold mb-2">{t('history.details.field')}</h3>
                      <p className="text-muted-foreground">{selectedAnalysis.field_name}</p>
                    </div>
                  )}
                  {selectedAnalysis.notes && (
                    <div>
                      <h3 className="font-semibold mb-2">{t('history.details.notes')}</h3>
                      <p className="text-muted-foreground">{selectedAnalysis.notes}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Share Dialog */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('history.share.title')}</DialogTitle>
              <DialogDescription>
                {t('history.share.desc')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('history.share.link_label')}</Label>
                <div className="flex gap-2">
                  <Input value={shareLink} readOnly />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(shareLink)
                      alert(t('history.share.copied'))
                    }}
                  >
                    {t('history.share.copy')}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('history.share.help_text')}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  )
}

