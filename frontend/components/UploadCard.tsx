'use client'

import React, { useCallback, useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Upload, Camera, Image as ImageIcon } from 'lucide-react'
import { analyzeImage, AnalysisResult } from '@/utils/api'

interface UploadCardProps {
  onAnalysisComplete?: (result: AnalysisResult) => void
}

export const UploadCard: React.FC<UploadCardProps> = ({ onAnalysisComplete }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    setIsUploading(true)
    try {
      const result = await analyzeImage(file)
      onAnalysisComplete?.(result)
    } catch (error) {
      console.error('Analysis error:', error)
      alert('Failed to analyze image. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }, [onAnalysisComplete])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleCameraClick = () => {
    cameraInputRef.current?.click()
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-gray-800">Analyze Maize Leaf</CardTitle>
        <CardDescription className="text-gray-600">
          Choose your input method: Upload an image or use your camera.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button
            onClick={handleUploadClick}
            className="bg-primary hover:bg-primary/90 text-white"
            disabled={isUploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Image
          </Button>
          <Button
            onClick={handleCameraClick}
            variant="outline"
            disabled={isUploading}
          >
            <Camera className="mr-2 h-4 w-4" />
            Use Camera
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileInput}
          className="hidden"
        />

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleUploadClick}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-colors
            ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'}
            ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-gray-600">Analyzing image...</p>
            </div>
          ) : (
            <>
              <ImageIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <p className="text-gray-700 mb-2 font-medium">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-gray-500">
                PNG, JPG, GIF, WEBP up to 5MB
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

