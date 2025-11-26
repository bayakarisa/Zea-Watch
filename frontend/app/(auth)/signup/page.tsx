'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { signUp } from '@/lib/auth'
import { migrateGuestAnalyses } from '@/utils/api'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function SignUpPage() {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError(t('auth.signup.error_required'))
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.signup.error_match'))
      return
    }

    if (formData.password.length < 6) {
      setError(t('auth.signup.error_length'))
      return
    }

    if (!formData.agreeToTerms) {
      setError(t('auth.signup.error_terms'))
      return
    }

    setLoading(true)

    try {
      const { data } = await signUp(formData.email, formData.password, formData.name)

      // If user is created, migrate guest analyses
      if (data?.user?.id) {
        try {
          await migrateGuestAnalyses(data.user.id)
        } catch (migrateError) {
          console.error('Error migrating guest analyses:', migrateError)
          // Don't fail signup if migration fails
        }
      }

      // Redirect to sign in page with success message
      router.push(`/signin?message=${encodeURIComponent(t('auth.signup.success_message'))}`)
    } catch (err: any) {
      setError(err.message || t('auth.signup.error_failed'))
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
            <CardTitle className="text-2xl">{t('auth.signup.title')}</CardTitle>
            <CardDescription>
              {t('auth.signup.subtitle')}
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

              <div className="space-y-2">
                <Label htmlFor="name">{t('auth.signup.name')}</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.signup.email')}</Label>
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
                <Label htmlFor="password">{t('auth.signup.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('auth.signup.confirm_password')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, agreeToTerms: checked === true })
                  }
                />
                <Label
                  htmlFor="terms"
                  className="text-sm font-normal cursor-pointer"
                >
                  {t('auth.signup.agree_terms')}{' '}
                  <Link href="/about?tab=terms" className="text-primary hover:underline">
                    {t('auth.signup.terms_link')}
                  </Link>
                </Label>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !formData.agreeToTerms}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('auth.signup.button_loading')}
                  </>
                ) : (
                  t('auth.signup.button')
                )}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                {t('auth.signup.has_account')}{' '}
                <Link href="/signin" className="text-primary hover:underline">
                  {t('auth.signup.signin_link')}
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

