'use client'

import React, { useCallback, useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Upload, Camera, Image as ImageIcon, X, Play } from 'lucide-react'
import { toast } from 'sonner'
import { analyzeImage, AnalysisResult } from '@/utils/api'
import { CameraCapture } from './CameraCapture'
import Image from 'next/image'

interface UploadCardProps {
  onAnalysisComplete?: (result: AnalysisResult) => void
}

export const UploadCard: React.FC<UploadCardProps> = ({ onAnalysisComplete }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    setError(null)
    setSelectedFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setError(null)

    try {
      // Try to get GPS location (optional, won't fail if denied)
      let locationData: { latitude: number; longitude: number; accuracy?: number } | undefined
      try {
        const { getCurrentLocation } = await import('@/utils/api')
        locationData = await getCurrentLocation()
      } catch (locError) {
        // Location is optional, continue without it
        console.log('Location not available:', locError)
      }

      const { analyzeImage } = await import('@/utils/api')
      const result = await analyzeImage(selectedFile, locationData)
      onAnalysisComplete?.(result)

      toast.success('Analysis complete!', {
        description: `Detected: ${result.disease} (${result.confidence.toFixed(1)}%)`
      })

      // Clear preview after successful analysis
      setPreviewImage(null)
      setSelectedFile(null)
      setError(null)
      // Reset file inputs
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (cameraInputRef.current) cameraInputRef.current.value = ''
    } catch (error: any) {
      console.error('Analysis error:', error)
      // Extract error message - check both response.data.error and message
      let errorMessage = 'Failed to analyze image. Please try again.'
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error?.message) {
        errorMessage = error.message
      }
      setError(errorMessage)
      toast.error('Analysis failed', {
        description: errorMessage
      })
      // Keep preview and file so user can see what they uploaded and try a different image
      // Don't clear preview on validation error
    } finally {
      setIsUploading(false)
    }
  }, [selectedFile, onAnalysisComplete])

  const handleClear = useCallback(() => {
    setPreviewImage(null)
    setSelectedFile(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }, [])

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
    // Check if getUserMedia is available (modern browsers)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setShowCamera(true)
    } else {
      // Fallback to file input with capture attribute for older browsers
      if (cameraInputRef.current) {
        cameraInputRef.current.setAttribute('capture', 'environment')
        cameraInputRef.current.setAttribute('accept', 'image/*')
        cameraInputRef.current.click()
      }
    }
  }

  const handleCameraCapture = (file: File) => {
    setShowCamera(false)
    handleFile(file)
  }

  return (
    <>
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
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
              disabled={isUploading || !!previewImage}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Image
            </Button>
            <Button
              onClick={handleCameraClick}
              variant="outline"
              disabled={isUploading || !!previewImage}
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
            id="camera-input"
          />

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg text-red-800 text-sm flex items-start justify-between gap-2">
              <div className="flex-1">
                <strong className="font-semibold">Validation Error:</strong>
                <p className="mt-1">{error}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-600 hover:text-red-800 flex-shrink-0"
                onClick={() => setError(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Preview and Upload Area */}
          {previewImage ? (
            <div className="space-y-4">
              <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden">
                <div className="relative w-full h-64 bg-gray-100">
                  <Image
                    src={previewImage}
                    alt="Preview"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                    onClick={handleClear}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={isUploading}
                className="w-full bg-primary hover:bg-primary/90 text-white"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Analyzing image...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Analyze Image
                  </>
                )}
              </Button>
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </>
  )
}
