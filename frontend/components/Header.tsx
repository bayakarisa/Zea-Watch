import React from 'react'
import { Leaf } from 'lucide-react'

export const Header: React.FC = () => {
  return (
    <header className="w-full px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Leaf className="h-8 w-8 text-primary" fill="currentColor" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-primary"></div>
        </div>
        <h1 className="text-2xl font-bold text-[#1e5f2e]">ZeaWatch</h1>
      </div>
    </header>
  )
}

