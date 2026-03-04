"use client"

import { useState, useCallback } from "react"
import { ImagePreview } from "@/components/image-preview"
import { RatioInfo } from "@/components/ratio-info"
import { RatioCard } from "@/components/ratio-card"
import { getExactRatio, findClosestRatios } from "@/lib/ratio-utils"
import { Scissors, CheckCircle2 } from "lucide-react"

interface CropModeProps {
  image: HTMLImageElement
}

export function CropMode({ image }: CropModeProps) {
  const [hoveredRatio, setHoveredRatio] = useState<{ w: number; h: number } | null>(null)
  const [tolerance, setTolerance] = useState(0.05)
  const [copiedMessage, setCopiedMessage] = useState(false)

  const handleCropped = useCallback(() => {
    setCopiedMessage(true)
    setTimeout(() => setCopiedMessage(false), 2500)
  }, [])

  const exact = getExactRatio(image.width, image.height)
  const matches = findClosestRatios(image.width, image.height, tolerance)

  return (
    <div className="flex flex-col gap-6">
      {/* Image Preview Canvas */}
      <ImagePreview image={image} hoveredRatio={hoveredRatio} />

      {/* Exact Ratio + Tolerance */}
      <RatioInfo
        display={exact.display}
        decimal={exact.decimal}
        width={exact.width}
        height={exact.height}
        tolerance={tolerance}
        onToleranceChange={setTolerance}
        matchCount={matches.length}
      />

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
  )
}
