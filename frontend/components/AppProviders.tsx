'use client'

import React from 'react'
import { I18nProvider } from './I18nProvider'
import { AuthProvider } from '@/context/AuthContext'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>{children}</AuthProvider>
    </I18nProvider>
  )
}

