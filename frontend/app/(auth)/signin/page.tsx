'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { signIn } from '@/lib/auth'
import { migrateGuestAnalyses } from '@/utils/api'
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@/context/AuthContext'

export default function SignInPage() {
  const { t } = useTranslation('common')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const message = searchParams.get('message')
    if (message) {
      setSuccess(message)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!formData.email || !formData.password) {
      setError(t('auth.signin.error_required'))
      return
    }

    setLoading(true)

    try {
      const user = await signIn(formData.email, formData.password, formData.rememberMe)

      // Get token that signIn stored in localStorage
      const token = localStorage.getItem('auth_token')

      if (user && token) {
        // Update AuthContext (which also sets auth_user in localStorage)
        login(token, user)

        // If user signs in, migrate guest analyses
        if (user.id) {
          try {
            await migrateGuestAnalyses(user.id)
          } catch (migrateError) {
            console.error('Error migrating guest analyses:', migrateError)
            // Don't fail signin if migration fails
          }
        }

        router.push('/dashboard') // Redirect to dashboard instead of root for better UX
        router.refresh()
      } else {
        throw new Error('Login failed: Missing token or user data')
      }
    } catch (err: any) {
      setError(err.message || t('auth.signin.error_failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">{t('auth.signin.title')}</CardTitle>
            <CardDescription>
              {t('auth.signin.subtitle')}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 rounded-md">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{success}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.signin.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.signin.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, rememberMe: checked === true })
                    }
                  />
                  <Label
                    htmlFor="rememberMe"
                    className="text-sm font-normal cursor-pointer"
                  >
                    {t('auth.signin.remember_me')}
                  </Label>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  {t('auth.signin.forgot_password')}
                </Link>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('auth.signin.button_loading')}
                  </>
                ) : (
                  t('auth.signin.button')
                )}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                {t('auth.signin.no_account')}{' '}
                <Link href="/signup" className="text-primary hover:underline">
                  {t('auth.signin.create_account')}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </main>
      <Footer />
    </div>
  )
}

