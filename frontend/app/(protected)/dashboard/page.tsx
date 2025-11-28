'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, UploadCloud, Trash2, FileText, Sparkles, Activity, Leaf, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { deleteUpload, fetchRecommendations, fetchUploads, uploadFile } from '@/lib/dashboardApi'
import { useTranslation } from 'react-i18next'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// --- Types ---
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

interface AnalysisRecord {
  id: string;
  disease: string;
  confidence: number;
  created_at: string;
  image_url?: string;
}

// --- Colors ---
const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

export default function DashboardPage() {
  const { t } = useTranslation('common')
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  // Data State
  const [uploads, setUploads] = useState<UploadRecord[]>([])
  const [recommendations, setRecommendations] = useState<RecommendationRecord[]>([])
  const [history, setHistory] = useState<AnalysisRecord[]>([])

  // UI State
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Chart Data State
  const [activityData, setActivityData] = useState<any[]>([])
  const [healthData, setHealthData] = useState<any[]>([])
  const [confidenceData, setConfidenceData] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalScans: 0,
    healthy: 0,
    diseased: 0,
    avgConfidence: 0
  })

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
        const token = localStorage.getItem('auth_token')
        const headers = { Authorization: `Bearer ${token}` }
        const apiUrl = 'http://127.0.0.1:5000' // Hardcoded for stability

        // Parallel Fetch
        const [uploadRes, recommendationRes, historyRes] = await Promise.all([
          fetchUploads(),
          fetchRecommendations(),
          fetch(`${apiUrl}/api/history?limit=100`, { headers })
        ])

        setUploads(uploadRes?.uploads || [])
        setRecommendations(recommendationRes?.recommendations || [])

        if (historyRes.ok) {
          const histData = await historyRes.json()
          const hist = histData || []
          setHistory(hist)
          processStats(hist)
        }

      } catch (err: any) {
        console.error(err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, authLoading, router])

  const processStats = (data: AnalysisRecord[]) => {
    // 1. Basic Counts
    let healthyCount = 0
    let diseasedCount = 0
    let totalConf = 0

    // 2. Activity (Group by Date)
    const activityMap = new Map<string, number>()

    // 3. Health Distribution
    const healthMap = new Map<string, number>()

    data.forEach(item => {
      // Stats
      const isHealthy = item.disease?.toLowerCase().includes('healthy')
      if (isHealthy) healthyCount++
      else diseasedCount++
      totalConf += item.confidence || 0

      // Activity
      const date = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      activityMap.set(date, (activityMap.get(date) || 0) + 1)

      // Distribution
      const label = item.disease || 'Unknown'
      healthMap.set(label, (healthMap.get(label) || 0) + 1)
    })

    setStats({
      totalScans: data.length,
      healthy: healthyCount,
      diseased: diseasedCount,
      avgConfidence: data.length > 0 ? totalConf / data.length : 0
    })

    // Format Charts
    const activity = Array.from(activityMap.entries())
      .map(([date, count]) => ({ date, count }))
      .reverse()
    setActivityData(activity)

    const health = Array.from(healthMap.entries())
      .map(([name, value]) => ({ name, value }))
    setHealthData(health)

    // 4. Confidence Levels
    let high = 0, medium = 0, low = 0
    data.forEach(item => {
      const conf = item.confidence || 0
      if (conf >= 0.8) high++
      else if (conf >= 0.5) medium++
      else low++
    })
    setConfidenceData([
      { name: 'High (>80%)', value: high },
      { name: 'Medium (50-80%)', value: medium },
      { name: 'Low (<50%)', value: low }
    ])
  }

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file) {
      setError(t('dashboard.upload.error_no_file'))
      return
    }
    try {
      setUploading(true)
      setError(null)
      const formData = new FormData()
      formData.append('file', file)
      await uploadFile(formData)
      setFile(null)
      // Refresh data
      const refresh = await fetchUploads()
      setUploads(refresh?.uploads || [])
      // Also refresh history ideally, but skipping for now
    } catch (err: any) {
      console.error(err)
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('dashboard.uploads.confirm_delete'))) return
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
        <main className="flex-1 flex items-center justify-center bg-gray-50/50">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl space-y-8">

        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Welcome back, {formattedUserName}
          </h1>
          <p className="text-muted-foreground">
            Here is an overview of your crop analysis and health reports.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Total Scans"
            value={stats.totalScans}
            icon={Activity}
            trend="Lifetime"
            trendUp={true}
          />
          <KpiCard
            title="Healthy Plants"
            value={stats.healthy}
            icon={CheckCircle2}
            trend={`${((stats.healthy / (stats.totalScans || 1)) * 100).toFixed(0)}% rate`}
            trendUp={true}
            color="text-green-600"
          />
          <KpiCard
            title="Diseased Plants"
            value={stats.diseased}
            icon={AlertTriangle}
            trend="Action needed"
            trendUp={false}
            color="text-red-600"
          />
          <KpiCard
            title="Avg Confidence"
            value={`${(stats.avgConfidence * 100).toFixed(1)}%`}
            icon={Sparkles}
            trend="AI Accuracy"
            trendUp={true}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 md:grid-cols-7">

          {/* Left Column: Charts & Upload */}
          <div className="col-span-4 space-y-6">

            {/* Activity Chart */}
            <Card className="shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle>My Analysis Activity</CardTitle>
                <CardDescription>Your scanning frequency over time.</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activityData}>
                      <defs>
                        <linearGradient id="colorCountUser" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorCountUser)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Upload Card */}
            <Card id="uploads" className="shadow-sm border-gray-200 bg-white">
              <CardHeader>
                <CardTitle>{t('dashboard.upload.title')}</CardTitle>
                <CardDescription>{t('dashboard.upload.desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col gap-4" onSubmit={handleUpload}>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <UploadCloud className="h-10 w-10 text-gray-400" />
                      <p className="text-sm font-medium text-gray-700">
                        {file ? file.name : "Click or drag to upload image"}
                      </p>
                      <p className="text-xs text-gray-500">Supports JPG, PNG</p>
                    </div>
                  </div>
                  <Button type="submit" disabled={uploading || !file} className="w-full">
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('dashboard.upload.uploading')}
                      </>
                    ) : (
                      t('dashboard.upload.button')
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

          </div>

          {/* Right Column: Disease Dist & Recent */}
          <div className="col-span-3 space-y-6">

            {/* Disease Distribution */}
            <Card className="shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle>Health Overview</CardTitle>
                <CardDescription>Status of your scanned plants.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={healthData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {healthData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent History List */}
            <Card className="shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle>Recent Scans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {history.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${item.disease.toLowerCase().includes('healthy') ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="text-sm font-medium">{item.disease}</p>
                          <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{(item.confidence * 100).toFixed(0)}%</Badge>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No scans yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>


        {/* New Row: Confidence Bar Chart */}
        <div className="grid gap-4 md:grid-cols-1">
          <Card className="shadow-sm border-gray-200">
            <CardHeader>
              <CardTitle>Confidence Levels</CardTitle>
              <CardDescription>Accuracy distribution of your analyses.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={confidenceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: '#f3f4f6' }}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for detailed tables */}
        <Tabs defaultValue="uploads" className="w-full">
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger value="uploads">My Uploads</TabsTrigger>
            <TabsTrigger value="history">Full History</TabsTrigger>
          </TabsList>

          <TabsContent value="uploads">
            <Card className="shadow-sm border-gray-200">
              <CardContent className="pt-6">
                {uploads.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No uploads found.</p>
                ) : (
                  <div className="space-y-2">
                    {uploads.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <span className="text-sm font-medium">{u.filename}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="shadow-sm border-gray-200">
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell>{new Date(h.created_at).toLocaleString()}</TableCell>
                        <TableCell className="font-medium">{h.disease}</TableCell>
                        <TableCell>{(h.confidence * 100).toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </main >
      <Footer />
    </div >
  )
}

function KpiCard({ title, value, icon: Icon, trend, trendUp, color }: any) {
  return (
    <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color || 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <p className={`text-xs ${trendUp ? 'text-green-600' : 'text-red-600'} flex items-center mt-1`}>
          {trend}
        </p>
      </CardContent>
    </Card>
  );
}

