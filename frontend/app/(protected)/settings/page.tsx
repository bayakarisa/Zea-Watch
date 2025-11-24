'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function SettingsPage() {
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
          <p className="text-sm text-muted-foreground">Preferences</p>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Control when ZeaWatch contacts you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-6">
              <div className="flex-1">
                <Label htmlFor="alerts">Email alerts</Label>
                <p className="text-sm text-muted-foreground">Receive an email when a new recommendation is ready.</p>
              </div>
              <Checkbox id="alerts" />
            </div>
            <div className="flex items-center justify-between gap-6">
              <div className="flex-1">
                <Label htmlFor="digest">Weekly digest</Label>
                <p className="text-sm text-muted-foreground">Summary of uploads, predictions, and suggestions.</p>
              </div>
              <Checkbox id="digest" defaultChecked />
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}

