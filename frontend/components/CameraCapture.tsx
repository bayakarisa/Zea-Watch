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
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0)

    // Convert canvas to blob and create file
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' })
        
        // Create preview
        const reader = new FileReader()
        reader.onload = (e) => {
          setCapturedImage(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      }
    }, 'image/jpeg', 0.9)
  }

  const confirmCapture = () => {
    if (!canvasRef.current || !capturedImage) return

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' })
        onCapture(file)
        stopCamera()
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
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Camera View */}
      {!capturedImage && (
        <>
          <div className="flex-1 relative bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 left-4 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => {
                stopCamera()
                onClose()
              }}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Capture controls */}
          <div className="bg-black p-6">
            <div className="flex justify-center">
              <Button
                onClick={capturePhoto}
                size="lg"
                className="rounded-full w-20 h-20 bg-white hover:bg-gray-200 border-4 border-gray-300"
              >
                <Camera className="h-10 w-10 text-gray-800" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Preview captured image */}
      {capturedImage && (
        <div className="flex-1 flex flex-col bg-black">
          <div className="flex-1 relative">
            <Image
              src={capturedImage}
              alt="Captured"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
          
          {/* Action buttons */}
          <div className="bg-black p-6 flex gap-4">
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
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

