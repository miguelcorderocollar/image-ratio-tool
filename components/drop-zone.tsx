"use client"

import { useCallback, useRef, useState } from "react"
import { Upload, ClipboardPaste } from "lucide-react"

interface DropZoneProps {
  onImageLoad: (image: HTMLImageElement, file?: File) => void
}

export function DropZone({ onImageLoad }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadImage = useCallback(
    (src: string, file?: File) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => onImageLoad(img, file)
      img.onerror = () => alert("Failed to load image. Please try another file.")
      img.src = src
    },
    [onImageLoad]
  )

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        alert("Please provide a valid image file.")
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          loadImage(e.target.result as string, file)
        }
      }
      reader.readAsDataURL(file)
    },
    [loadImage]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) {
            handleFile(file)
            return
          }
        }
      }
    },
    [handleFile]
  )

  return (
    <div
      role="button"
      tabIndex={0}
      className={`relative flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-12 transition-colors cursor-pointer min-h-[280px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/50"
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onPaste={handlePaste}
      onClick={() => fileInputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          fileInputRef.current?.click()
        }
      }}
    >
      <div className="flex items-center gap-3 text-muted-foreground">
        <Upload className="size-8" />
        <ClipboardPaste className="size-8" />
      </div>
      <div className="text-center">
        <p className="text-lg font-medium text-foreground">
          Drop, paste, or click to upload
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Supports PNG, JPG, WebP, GIF, and SVG
        </p>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <kbd className="inline-flex items-center gap-1 rounded border border-border bg-secondary px-2 py-1 text-xs font-mono text-muted-foreground">
          Ctrl+V
        </kbd>
        <span className="text-xs text-muted-foreground">to paste from clipboard</span>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ""
        }}
        aria-label="Upload image file"
      />
    </div>
  )
}
