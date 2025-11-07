'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Camera, X, Check } from 'lucide-react'
import Image from 'next/image'

interface CameraCaptureProps {
  onCapture: (file: File) => void
  onClose: () => void
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isVideoReady, setIsVideoReady] = useState(false)

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        setStream(mediaStream)
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play()
            setIsVideoReady(true)
          }
        }
      }
    } catch (err: any) {
      console.error('Camera error:', err)
      setError(err.message || 'Failed to access camera. Please check permissions.')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !isVideoReady) {
      console.log('Camera not ready:', { video: !!videoRef.current, canvas: !!canvasRef.current, ready: isVideoReady })
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      console.error('Could not get canvas context')
      return
    }

    // Check if video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('Video has no dimensions')
      return
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert canvas to blob and create preview
    canvas.toBlob((blob) => {
      if (blob) {
        // Create preview from blob
        const reader = new FileReader()
        reader.onload = (e) => {
          if (e.target?.result) {
            setCapturedImage(e.target.result as string)
          }
        }
        reader.readAsDataURL(blob)
      } else {
        console.error('Failed to create blob from canvas')
      }
    }, 'image/jpeg', 0.9)
  }

  const confirmCapture = () => {
    if (!canvasRef.current) {
      console.error('Canvas not available')
      return
    }

    // Re-convert canvas to file
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' })
        onCapture(file)
        stopCamera()
      } else {
        console.error('Failed to create file from canvas')
      }
    }, 'image/jpeg', 0.9)
  }

  const retake = () => {
    setCapturedImage(null)
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-semibold mb-2">Camera Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={onClose} className="w-full">Close</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col" style={{ zIndex: 9999 }}>
      {/* Camera View */}
      {!capturedImage && (
        <>
          <div className="flex-1 relative bg-black overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ minHeight: '100%' }}
            />
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 left-4 bg-black/50 hover:bg-black/70 text-white border-0"
              onClick={() => {
                stopCamera()
                onClose()
              }}
            >
              <X className="h-5 w-5" />
            </Button>
            
            {/* Video ready indicator (hidden, for debugging) */}
            {!isVideoReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <p className="text-white">Loading camera...</p>
              </div>
            )}
          </div>

          {/* Capture controls - always visible at bottom */}
          <div className="bg-black p-6 flex-shrink-0">
            <div className="flex justify-center items-center">
              <Button
                onClick={capturePhoto}
                disabled={!isVideoReady}
                size="lg"
                className="rounded-full w-20 h-20 p-0 bg-white hover:bg-gray-200 border-4 border-gray-300 flex items-center justify-center disabled:opacity-50"
                style={{ minWidth: '80px', minHeight: '80px' }}
              >
                <Camera className="h-10 w-10 text-gray-800" />
              </Button>
            </div>
            {!isVideoReady && (
              <p className="text-white text-center text-sm mt-2">Waiting for camera...</p>
            )}
          </div>
        </>
      )}

      {/* Preview captured image */}
      {capturedImage && (
        <div className="flex-1 flex flex-col bg-black">
          <div className="flex-1 relative min-h-0">
            <Image
              src={capturedImage}
              alt="Captured"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
          
          {/* Action buttons */}
          <div className="bg-black p-6 flex gap-4 flex-shrink-0">
            <Button
              onClick={retake}
              variant="outline"
              className="flex-1 bg-white text-black hover:bg-gray-200"
            >
              <X className="mr-2 h-4 w-4" />
              Retake
            </Button>
            <Button
              onClick={confirmCapture}
              className="flex-1 bg-primary hover:bg-primary/90 text-white"
            >
              <Check className="mr-2 h-4 w-4" />
              Use Photo
            </Button>
          </div>
        </div>
      )}

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
