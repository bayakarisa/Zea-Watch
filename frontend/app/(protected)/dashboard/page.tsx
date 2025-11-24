'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, UploadCloud, Trash2, FileText, Sparkles } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { deleteUpload, fetchRecommendations, fetchUploads, uploadFile } from '@/lib/dashboardApi'

interface UploadRecord {
  id: string
  filename: string
  storage_path: string
  created_at: string
  file_size?: number
  mime_type?: string
  metadata?: Record<string, any>
}

interface RecommendationRecord {
  id: string
  recommendation_type: string
  summary?: string
  content?: Record<string, any>
  score?: number
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [uploads, setUploads] = useState<UploadRecord[]>([])
  const [recommendations, setRecommendations] = useState<RecommendationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const formattedUserName = useMemo(() => {
    if (!user) return ''
    return user.name || user.email
  }, [user])

  useEffect(() => {
    const loadData = async () => {
      if (authLoading) return
      if (!user) {
        router.push('/signin')
        return
      }

      try {
        setLoading(true)
        const [uploadRes, recommendationRes] = await Promise.all([fetchUploads(), fetchRecommendations()])
        setUploads(uploadRes?.uploads || [])
        setRecommendations(recommendationRes?.recommendations || [])
      } catch (err: any) {
        console.error(err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, authLoading, router])

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file) {
      setError('Choose a file to upload')
      return
    }
    try {
      setUploading(true)
      setError(null)
      const formData = new FormData()
      formData.append('file', file)
      await uploadFile(formData)
      setFile(null)
      const refresh = await fetchUploads()
      setUploads(refresh?.uploads || [])
    } catch (err: any) {
      console.error(err)
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this upload?')) return
    try {
      await deleteUpload(id)
      setUploads((prev) => prev.filter((upload) => upload.id !== id))
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (authLoading || loading) {
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
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-6xl space-y-8">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="text-3xl font-bold text-foreground">{formattedUserName}</h1>
          <p className="text-muted-foreground">
            Track your uploads, view personalized recommendations, and manage your ZeaWatch account.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Uploads</CardTitle>
              <CardDescription>Total files you have uploaded</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{uploads.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>Insights generated for you</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{recommendations.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Account role</CardTitle>
              <CardDescription>Your access level</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="text-base capitalize">
                {user?.role || 'user'}
              </Badge>
            </CardContent>
          </Card>
        </div>

        <Card id="uploads">
          <CardHeader>
            <CardTitle>Upload new data</CardTitle>
            <CardDescription>Attach new imagery or files for your agronomic records.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4 md:flex-row md:items-center" onSubmit={handleUpload}>
              <Input
                type="file"
                accept="image/*,.zip,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
              <Button type="submit" disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Upload file
                  </>
                )}
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">Max size 5MB. Accepted formats: images, PDF, ZIP.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My uploads</CardTitle>
            <CardDescription>Only you (and admins) can see these files.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploads.length === 0 ? (
              <p className="text-sm text-muted-foreground">No uploads yet. Start by adding a file above.</p>
            ) : (
              <div className="space-y-3">
                {uploads.map((upload) => (
                  <div
                    key={upload.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{upload.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(upload.created_at).toLocaleString()} ·{' '}
                          {upload.file_size ? `${(upload.file_size / 1024).toFixed(1)} KB` : 'size unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="sm" asChild>
                        <a href={upload.storage_path} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(upload.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card id="recommendations">
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>Personalized insights generated for your farm.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recommendations available yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {recommendations.map((rec) => (
                  <div key={rec.id} className="rounded-md border p-4 shadow-sm">
                    <div className="mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold capitalize">{rec.recommendation_type}</p>
                      {rec.score !== undefined && (
                        <Badge variant="outline">Score: {Number(rec.score).toFixed(1)}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {rec.summary || rec.content?.message || 'See detailed content below.'}
                    </p>
                    {rec.content && (
                      <pre className="mt-3 max-h-40 overflow-auto rounded bg-muted/50 p-2 text-xs">
                        {JSON.stringify(rec.content, null, 2)}
                      </pre>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">
                      Generated {new Date(rec.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}

