'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, UploadCloud } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function UploadsPage() {
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
          <p className="text-sm text-muted-foreground">Your data</p>
          <h1 className="text-3xl font-bold text-foreground">My uploads</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Manage your files</CardTitle>
            <CardDescription>Upload, review, or remove field observations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The main dashboard lists every file you have uploaded along with actions to view or delete them.
              Use the shortcut below to jump back there.
            </p>
            <Button asChild>
              <Link href="/dashboard#uploads">
                <UploadCloud className="mr-2 h-4 w-4" />
                Go to uploads
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}

