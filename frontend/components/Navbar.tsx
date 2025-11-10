'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Leaf, User, LogOut, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { supabase } from '@/lib/supabaseClient'
import { User as SupabaseUser } from '@supabase/supabase-js'

export const Navbar: React.FC = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isActive = (path: string) => pathname === path

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center gap-3">
            <div className="relative">
              <Leaf className="h-8 w-8 text-primary" fill="currentColor" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-primary"></div>
            </div>
            <span className="text-2xl font-bold text-foreground">ZeaWatch</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/about"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive('/about') ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              About Us
            </Link>

            {loading ? (
              <div className="h-9 w-20 animate-pulse bg-muted rounded-md"></div>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden lg:inline">{user.email?.split('@')[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/history" className="cursor-pointer">
                      History
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/map" className="cursor-pointer">
                      Map
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-3">
                <Button variant="ghost" asChild>
                  <Link href="/signin">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4 space-y-3">
            <Link
              href="/about"
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              About Us
            </Link>
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  href="/dashboard"
                  className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/history"
                  className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  History
                </Link>
                <Link
                  href="/map"
                  className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Map
                </Link>
                <button
                  onClick={() => {
                    handleSignOut()
                    setMobileMenuOpen(false)
                  }}
                  className="block w-full text-left px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 px-3">
                <Button variant="ghost" asChild>
                  <Link href="/signin" onClick={() => setMobileMenuOpen(false)}>
                    Sign In
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                    Sign Up
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

