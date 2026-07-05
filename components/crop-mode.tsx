"use client"

import { useState, useCallback, useEffect } from "react"
import { ImagePreview } from "@/components/image-preview"
import { RatioInfo } from "@/components/ratio-info"
import { RatioCard } from "@/components/ratio-card"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getCropDimensions,
  getExactRatio,
  findClosestRatios,
  RATIO_OPTIONS,
  renderCroppedCanvas,
} from "@/lib/ratio-utils"
import type { StandardRatio } from "@/lib/ratio-utils"
import { Copy, Download, Scissors, CheckCircle2 } from "lucide-react"

interface CropModeProps {
  image: HTMLImageElement
}

type CropRect = { x: number; y: number; width: number; height: number }

export function CropMode({ image }: CropModeProps) {
  const [hoveredRatio, setHoveredRatio] = useState<{ w: number; h: number } | null>(null)
  const [selectedRatio, setSelectedRatio] = useState<StandardRatio | null>(null)
  const [selectedRatioValue, setSelectedRatioValue] = useState("1:1")
  const [customW, setCustomW] = useState("16")
  const [customH, setCustomH] = useState("9")
  const [isCustom, setIsCustom] = useState(false)
  const [hasManualOverride, setHasManualOverride] = useState(false)
  const [cropRect, setCropRect] = useState<CropRect | null>(null)
  const [tolerance, setTolerance] = useState(0.05)
  const [copiedMessage, setCopiedMessage] = useState(false)

  const handleCropped = useCallback(() => {
    setCopiedMessage(true)
    setTimeout(() => setCopiedMessage(false), 2500)
  }, [])

  const exact = getExactRatio(image.width, image.height)
  const matches = findClosestRatios(image.width, image.height, tolerance)
  const activeRatio = selectedRatio ? { w: selectedRatio.w, h: selectedRatio.h } : null
  const previewRatio = hoveredRatio ?? activeRatio

  const applyRatio = useCallback((ratio: StandardRatio, isManual: boolean) => {
    setSelectedRatio(ratio)
    setCropRect(getCropDimensions(image.width, image.height, ratio.w, ratio.h))
    if (isManual) {
      setHasManualOverride(true)
    }
  }, [image])

  const handleSelectRatio = useCallback((ratio: StandardRatio) => {
    setSelectedRatioValue(ratio.name)
    setIsCustom(false)
    applyRatio(ratio, true)
  }, [applyRatio])

  const resolveManualRatio = useCallback((): StandardRatio => {
    if (isCustom) {
      const w = Math.max(1, parseInt(customW) || 1)
      const h = Math.max(1, parseInt(customH) || 1)
      return {
        name: `${w}:${h}`,
        w,
        h,
        decimal: w / h,
        category: "Custom",
      }
    }

    const preset = RATIO_OPTIONS.find((ratio) => ratio.value === selectedRatioValue)?.value ?? "1:1"
    const [w, h] = preset.split(":").map((value) => parseInt(value, 10))
    return {
      name: preset,
      w,
      h,
      decimal: w / h,
      category: "Preset",
    }
  }, [customH, customW, isCustom, selectedRatioValue])

  useEffect(() => {
    if (!hasManualOverride && matches.length > 0) {
      const closestRatio = matches[0].ratio
      if (selectedRatio?.name === closestRatio.name) return
      setSelectedRatioValue(closestRatio.name)
      setIsCustom(false)
      applyRatio(closestRatio, false)
    }
  }, [applyRatio, hasManualOverride, matches, selectedRatio])

  useEffect(() => {
    if (hasManualOverride) {
      applyRatio(resolveManualRatio(), true)
    }
  }, [applyRatio, hasManualOverride, resolveManualRatio])

  const getActiveCanvas = useCallback(() => {
    if (!cropRect) return null
    return renderCroppedCanvas(image, cropRect)
  }, [cropRect, image])

  const handleCropAndCopy = useCallback(async () => {
    const canvas = getActiveCanvas()
    if (!canvas || !selectedRatio) return

    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ])
        handleCropped()
      }
    } catch {
      const link = document.createElement("a")
      link.download = `cropped-${selectedRatio.name.replace(":", "x")}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
      handleCropped()
    }
  }, [getActiveCanvas, handleCropped, selectedRatio])

  const handleDownload = useCallback(() => {
    const canvas = getActiveCanvas()
    if (!canvas || !selectedRatio) return

    const link = document.createElement("a")
    link.download = `cropped-${selectedRatio.name.replace(":", "x")}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }, [getActiveCanvas, selectedRatio])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <FieldGroup className="gap-4 rounded-lg border border-border p-4">
          <Field orientation="responsive">
            <FieldLabel htmlFor="crop-target-ratio">Target Ratio</FieldLabel>
            <FieldContent className="gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Select
                  value={isCustom ? "custom" : selectedRatioValue}
                  onValueChange={(value) => {
                    if (value === "custom") {
                      setIsCustom(true)
                      setHasManualOverride(true)
                      return
                    }

                    setSelectedRatioValue(value)
                    setIsCustom(false)
                    const [w, h] = value.split(":").map((part) => parseInt(part, 10))
                    applyRatio({
                      name: value,
                      w,
                      h,
                      decimal: w / h,
                      category: "Preset",
                    }, true)
                  }}
                >
                  <SelectTrigger id="crop-target-ratio" size="sm" className="w-full sm:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {RATIO_OPTIONS.map((ratio) => (
                        <SelectItem key={ratio.value} value={ratio.value}>
                          {ratio.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {isCustom && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={customW}
                      onChange={(e) => setCustomW(e.target.value)}
                      className="w-20 font-mono text-center"
                      aria-label="Custom width ratio"
                    />
                    <span className="font-mono text-muted-foreground">:</span>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={customH}
                      onChange={(e) => setCustomH(e.target.value)}
                      className="w-20 font-mono text-center"
                      aria-label="Custom height ratio"
                    />
                  </div>
                )}
              </div>
            </FieldContent>
          </Field>
        </FieldGroup>

        <RatioInfo
          display={exact.display}
          decimal={exact.decimal}
          width={exact.width}
          height={exact.height}
          tolerance={tolerance}
          onToleranceChange={setTolerance}
          matchCount={matches.length}
        />
      </div>

      {/* Image Preview Canvas */}
      <ImagePreview
        image={image}
        hoveredRatio={previewRatio}
        cropRect={hoveredRatio ? null : selectedRatio ? cropRect : null}
        onCropRectChange={setCropRect}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
        <Button onClick={handleCropAndCopy} className="gap-2" disabled={!cropRect || !selectedRatio}>
          <Copy data-icon="inline-start" />
          Copy to Clipboard
        </Button>
        <Button variant="outline" onClick={handleDownload} className="gap-2" disabled={!cropRect || !selectedRatio}>
          <Download data-icon="inline-start" />
          Download PNG
        </Button>
        {selectedRatio && (
          <span className="text-sm text-muted-foreground">
            Active crop: <span className="font-mono text-foreground">{selectedRatio.name}</span>
          </span>
        )}
      </div>

      {/* Suggestions Grid */}
      {matches.length > 0 ? (
        <section aria-label="Suggested aspect ratios">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-foreground">Suggested ratios</h2>
            <span className="text-xs text-muted-foreground">
              Closest matches within tolerance
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => (
              <RatioCard
                key={match.ratio.name}
                match={match}
                isExactMatch={match.difference === 0}
                isSelected={selectedRatio?.name === match.ratio.name}
                onHover={setHoveredRatio}
                onSelect={handleSelectRatio}
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
          <p className="text-xs text-muted-foreground">
            The target ratio control above still lets you crop to any preset or custom ratio.
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
