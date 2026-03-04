"use client"

import { useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import type { RatioMatch } from "@/lib/ratio-utils"
import { getCropDimensions } from "@/lib/ratio-utils"
import { Check, Copy, Crop } from "lucide-react"

interface RatioCardProps {
  match: RatioMatch
  image: HTMLImageElement
  isExactMatch: boolean
  onHover: (ratio: { w: number; h: number } | null) => void
  onCropped: () => void
}

export function RatioCard({
  match,
  image,
  isExactMatch,
  onHover,
  onCropped,
}: RatioCardProps) {
  const { ratio, percentDiff } = match

  const handleCropAndCopy = useCallback(async () => {
    const crop = getCropDimensions(
      image.width,
      image.height,
      ratio.w,
      ratio.h
    )

    const canvas = document.createElement("canvas")
    canvas.width = crop.width
    canvas.height = crop.height
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height
    )

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      )
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ])
        onCropped()
      }
    } catch {
      // Fallback: download instead
      const link = document.createElement("a")
      link.download = `cropped-${ratio.name.replace(":", "x")}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
      onCropped()
    }
  }, [image, ratio, onCropped])

  const handleDownload = useCallback(() => {
    const crop = getCropDimensions(
      image.width,
      image.height,
      ratio.w,
      ratio.h
    )

    const canvas = document.createElement("canvas")
    canvas.width = crop.width
    canvas.height = crop.height
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height
    )

    const link = document.createElement("a")
    link.download = `cropped-${ratio.name.replace(":", "x")}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }, [image, ratio])

  return (
    <div
      className={`group relative flex flex-col gap-2 rounded-lg border p-4 transition-all cursor-pointer ${
        isExactMatch
          ? "border-primary/50 bg-primary/5"
          : "border-border hover:border-muted-foreground/40 hover:bg-secondary/50"
      }`}
      onMouseEnter={() => onHover({ w: ratio.w, h: ratio.h })}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover({ w: ratio.w, h: ratio.h })}
      onBlur={() => onHover(null)}
      tabIndex={0}
      role="button"
      aria-label={`${ratio.name} ratio - ${ratio.category}. ${isExactMatch ? "Exact match." : `${(percentDiff * 100).toFixed(1)}% difference.`} Click to crop and copy.`}
      onClick={handleCropAndCopy}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          handleCropAndCopy()
        }
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg font-mono font-semibold text-foreground">
          {ratio.name}
        </span>
        <Badge
          variant={isExactMatch ? "default" : "secondary"}
          className={isExactMatch ? "" : "text-muted-foreground"}
        >
          {ratio.category}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-sm">
        {isExactMatch ? (
          <span className="flex items-center gap-1 text-primary font-medium">
            <Check className="size-3.5" />
            Exact match
          </span>
        ) : (
          <span className="text-muted-foreground font-mono">
            {(percentDiff * 100).toFixed(1)}% off
          </span>
        )}
        <span className="text-muted-foreground font-mono text-xs">
          {ratio.decimal.toFixed(3)}
        </span>
      </div>

      <div className="flex items-center gap-1.5 mt-1 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleCropAndCopy()
          }}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
          aria-label={`Copy ${ratio.name} cropped image to clipboard`}
        >
          <Copy className="size-3" />
          Copy
        </button>
        <span className="text-border">|</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDownload()
          }}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
          aria-label={`Download ${ratio.name} cropped image`}
        >
          <Crop className="size-3" />
          Download
        </button>
      </div>
    </div>
  )
}
