'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabaseClient'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { Loader2 } from 'lucide-react'

interface Analysis {
  id: string
  disease: string
  confidence: number
  created_at: string
  latitude?: number
  longitude?: number
  field_name?: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/signin')
        return
      }

      setUser(authUser)

      // Fetch analyses
      const { data: analysesData, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching analyses:', error)
      } else {
        setAnalyses(analysesData || [])
      }

      setLoading(false)
    }

    fetchData()
  }, [router])

  // Calculate disease frequency
  const diseaseFrequency = analyses.reduce((acc, analysis) => {
    acc[analysis.disease] = (acc[analysis.disease] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const diseaseChartData = Object.entries(diseaseFrequency).map(([name, value]) => ({
    name,
    value,
  }))

  // Calculate confidence trends (by month)
  const confidenceByMonth = analyses.reduce((acc, analysis) => {
    const date = new Date(analysis.created_at)
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!acc[month]) {
      acc[month] = { month, total: 0, count: 0, avg: 0 }
    }
    acc[month].total += analysis.confidence
    acc[month].count += 1
    acc[month].avg = acc[month].total / acc[month].count
    return acc
  }, {} as Record<string, { month: string; total: number; count: number; avg: number }>)

  const confidenceTrendData = Object.values(confidenceByMonth)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((item) => ({ month: item.month, confidence: Number(item.avg.toFixed(2)) }))

  // Calculate most affected fields
  const fieldFrequency = analyses
    .filter((a) => a.field_name)
    .reduce((acc, analysis) => {
      const field = analysis.field_name || 'Unknown'
      acc[field] = (acc[field] || 0) + 1
      return acc
    }, {} as Record<string, number>)

  const fieldChartData = Object.entries(fieldFrequency)
    .map(([name, value]) => ({ name, count: value }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Seasonal patterns (by month)
  const seasonalData = analyses.reduce((acc, analysis) => {
    const date = new Date(analysis.created_at)
    const month = date.toLocaleString('default', { month: 'short' })
    acc[month] = (acc[month] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const seasonalChartData = Object.entries(seasonalData).map(([name, value]) => ({
    name,
    count: value,
  }))

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
        <h1 className="text-4xl font-bold text-foreground mb-8">Analytics Dashboard</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Total Analyses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analyses.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Unique Diseases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{Object.keys(diseaseFrequency).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Average Confidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {analyses.length > 0
                  ? (
                      analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length
                    ).toFixed(1)
                  : '0'}
                %
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Disease Frequency Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Disease Frequency</CardTitle>
            <CardDescription>Distribution of detected diseases</CardDescription>
          </CardHeader>
          <CardContent>
            {diseaseChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={diseaseChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {diseaseChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No data available. Start analyzing leaves to see your statistics.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Confidence Trend */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Confidence Trend</CardTitle>
            <CardDescription>Average confidence over time</CardDescription>
          </CardHeader>
          <CardContent>
            {confidenceTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={confidenceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="confidence" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No data available. Start analyzing leaves to see trends.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Seasonal Patterns */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Seasonal Patterns</CardTitle>
            <CardDescription>Analysis frequency by month</CardDescription>
          </CardHeader>
          <CardContent>
            {seasonalChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={seasonalChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No data available. Start analyzing leaves to see patterns.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Most Affected Fields */}
        {fieldChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Most Affected Fields</CardTitle>
              <CardDescription>Fields with the most disease detections</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={fieldChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  )
}

