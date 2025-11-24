'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function RecommendationsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

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

  if (!user) {
    router.push('/signin')
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Insights</p>
          <h1 className="text-3xl font-bold text-foreground">Recommendations</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your personalized insights</CardTitle>
            <CardDescription>See all recommendations on your dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Recommendations are generated automatically based on your uploads and model outputs. Visit the dashboard to
              read the latest suggestions and agronomic guidance.
            </p>
            <Button asChild>
              <Link href="/dashboard#recommendations">
                <Sparkles className="mr-2 h-4 w-4" />
                View recommendations
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}

