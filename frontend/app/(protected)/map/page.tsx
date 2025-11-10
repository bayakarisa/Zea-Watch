'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabaseClient'
import { Loader2, MapPin, Filter } from 'lucide-react'

// Dynamically import MapContainer to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)

interface Analysis {
  id: string
  disease: string
  confidence: number
  latitude: number | null
  longitude: number | null
  field_name: string | null
  created_at: string
}

const diseaseColors: Record<string, string> = {
  'Northern Leaf Blight': '#FF8042',
  'Common Rust': '#FFBB28',
  'Gray Leaf Spot': '#8884d8',
  'Healthy': '#00C49F',
}

export default function MapPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [filteredAnalyses, setFilteredAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    disease: '',
    dateFrom: '',
    dateTo: '',
    region: '',
  })
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    // Check if Leaflet is already loaded
    if (typeof window !== 'undefined' && (window as any).L) {
      setMapLoaded(true)
      return
    }

    // Load Leaflet JS (CSS is already in layout)
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
    script.crossOrigin = ''
    script.onload = () => setMapLoaded(true)
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/signin')
        return
      }

      setUser(authUser)

      const { data: analysesData, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', authUser.id)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching analyses:', error)
      } else {
        setAnalyses(analysesData || [])
        setFilteredAnalyses(analysesData || [])
      }

      setLoading(false)
    }

    fetchData()
  }, [router])

  useEffect(() => {
    let filtered = [...analyses]

    if (filters.disease) {
      filtered = filtered.filter((a) =>
        a.disease.toLowerCase().includes(filters.disease.toLowerCase())
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

  // Calculate center of map (average of all locations)
  const getMapCenter = (): [number, number] => {
    if (filteredAnalyses.length === 0) return [0, 0]
    const lat =
      filteredAnalyses.reduce((sum, a) => sum + (a.latitude || 0), 0) /
      filteredAnalyses.length
    const lng =
      filteredAnalyses.reduce((sum, a) => sum + (a.longitude || 0), 0) /
      filteredAnalyses.length
    return [lat, lng]
  }

  // Aggregate data by region (simplified - using rounded coordinates)
  const getRegionalData = () => {
    const regionalData: Record<string, Record<string, number>> = {}
    filteredAnalyses.forEach((analysis) => {
      if (analysis.latitude && analysis.longitude) {
        // Round to 2 decimal places for regional grouping
        const region = `${analysis.latitude.toFixed(2)},${analysis.longitude.toFixed(2)}`
        if (!regionalData[region]) {
          regionalData[region] = {}
        }
        regionalData[region][analysis.disease] =
          (regionalData[region][analysis.disease] || 0) + 1
      }
    })
    return regionalData
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

  const center = getMapCenter()
  const hasValidCenter = center[0] !== 0 && center[1] !== 0

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-7xl">
        <h1 className="text-4xl font-bold text-foreground mb-8">Field Mapping</h1>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="disease">Disease</Label>
                <Input
                  id="disease"
                  placeholder="Filter by disease"
                  value={filters.disease}
                  onChange={(e) => setFilters({ ...filters, disease: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() =>
                    setFilters({ disease: '', dateFrom: '', dateTo: '', region: '' })
                  }
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Field Locations</CardTitle>
            <CardDescription>
              GPS locations of your analyses. Markers are color-coded by disease type.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!mapLoaded ? (
              <div className="h-96 flex items-center justify-center bg-muted rounded-md">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredAnalyses.length === 0 ? (
              <div className="h-96 flex items-center justify-center bg-muted rounded-md">
                <p className="text-muted-foreground">
                  No analyses with location data. Enable GPS when analyzing leaves to see them on the map.
                </p>
              </div>
            ) : !hasValidCenter ? (
              <div className="h-96 flex items-center justify-center bg-muted rounded-md">
                <p className="text-muted-foreground">Invalid location data</p>
              </div>
            ) : (
              <div className="h-96 w-full rounded-md overflow-hidden border">
                <MapContainer
                  center={center}
                  zoom={hasValidCenter ? 10 : 2}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {filteredAnalyses.map((analysis) => {
                    if (!analysis.latitude || !analysis.longitude) return null
                    return (
                      <Marker
                        key={analysis.id}
                        position={[analysis.latitude, analysis.longitude]}
                      >
                        <Popup>
                          <div className="p-2">
                            <h3 className="font-semibold">{analysis.disease}</h3>
                            <p className="text-sm">Confidence: {analysis.confidence}%</p>
                            <p className="text-sm">
                              Date: {new Date(analysis.created_at).toLocaleDateString()}
                            </p>
                            {analysis.field_name && (
                              <p className="text-sm">Field: {analysis.field_name}</p>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    )
                  })}
                </MapContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Regional Data Summary */}
        {filteredAnalyses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Regional Disease Summary</CardTitle>
              <CardDescription>
                Aggregated data by region (GPS coordinates rounded for privacy)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(getRegionalData()).map(([region, diseases]) => (
                  <div key={region} className="border rounded-md p-4">
                    <h3 className="font-semibold mb-2">Region: {region}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.entries(diseases).map(([disease, count]) => (
                        <div key={disease} className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: diseaseColors[disease] || '#8884d8' }}
                          />
                          <span className="text-sm">
                            {disease}: {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(diseaseColors).map(([disease, color]) => (
                <div key={disease} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm">{disease}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}

