"use client"

import { useState, useCallback, useEffect } from "react"
import { DropZone } from "@/components/drop-zone"
import { ImagePreview } from "@/components/image-preview"
import { RatioInfo } from "@/components/ratio-info"
import { RatioCard } from "@/components/ratio-card"
import { getExactRatio, findClosestRatios } from "@/lib/ratio-utils"
import { Button } from "@/components/ui/button"
import { RotateCcw, Scissors, CheckCircle2 } from "lucide-react"

export default function Page() {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [hoveredRatio, setHoveredRatio] = useState<{ w: number; h: number } | null>(null)
  const [tolerance, setTolerance] = useState(0.05)
  const [copiedMessage, setCopiedMessage] = useState(false)

  const handleImageLoad = useCallback((img: HTMLImageElement) => {
    setImage(img)
    setHoveredRatio(null)
    setCopiedMessage(false)
  }, [])

  const handleReset = useCallback(() => {
    setImage(null)
    setHoveredRatio(null)
    setCopiedMessage(false)
    setTolerance(0.05)
  }, [])

  const handleCropped = useCallback(() => {
    setCopiedMessage(true)
    setTimeout(() => setCopiedMessage(false), 2500)
  }, [])

  // Global paste listener so the user can paste from anywhere on the page
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) {
            const reader = new FileReader()
            reader.onload = (ev) => {
              if (ev.target?.result) {
                const img = new Image()
                img.crossOrigin = "anonymous"
                img.onload = () => handleImageLoad(img)
                img.src = ev.target.result as string
              }
            }
            reader.readAsDataURL(file)
            return
          }
        }
      }
    }
    window.addEventListener("paste", handlePaste)
    return () => window.removeEventListener("paste", handlePaste)
  }, [handleImageLoad])

  const exact = image ? getExactRatio(image.width, image.height) : null
  const matches = image ? findClosestRatios(image.width, image.height, tolerance) : []

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl text-balance">
              Image Ratio Tool
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Analyze aspect ratios and crop to standard formats
            </p>
          </div>
          {image && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="size-4 mr-1.5" />
              Reset
            </Button>
          )}
        </header>

        {/* Content */}
        {!image ? (
          <DropZone onImageLoad={handleImageLoad} />
        ) : (
          <div className="flex flex-col gap-6">
            {/* Image Preview Canvas */}
            <ImagePreview image={image} hoveredRatio={hoveredRatio} />

            {/* Exact Ratio + Tolerance */}
            {exact && (
              <RatioInfo
                display={exact.display}
                decimal={exact.decimal}
                width={exact.width}
                height={exact.height}
                tolerance={tolerance}
                onToleranceChange={setTolerance}
                matchCount={matches.length}
              />
            )}

            {/* Suggestions Grid */}
            {matches.length > 0 ? (
              <section aria-label="Suggested aspect ratios">
                <h2 className="sr-only">Suggested aspect ratios</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {matches.map((match) => (
                    <RatioCard
                      key={match.ratio.name}
                      match={match}
                      image={image}
                      isExactMatch={match.difference === 0}
                      onHover={setHoveredRatio}
                      onCropped={handleCropped}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10">
                <Scissors className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No matches within tolerance. Try increasing it.
                </p>
              </div>
            )}

            {/* Copied toast */}
            {copiedMessage && (
              <div
                className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300"
                role="status"
                aria-live="polite"
              >
                <CheckCircle2 className="size-4" />
                Cropped image copied to clipboard
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
