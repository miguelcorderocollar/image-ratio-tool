"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getExactRatio,
  getBorderDimensions,
  getAverageEdgeColor,
  STANDARD_RATIOS,
} from "@/lib/ratio-utils"
import {
  RotateCcw,
  Copy,
  Download,
  CheckCircle2,
  Frame,
  AlertCircle,
} from "lucide-react"

export type BorderStyle = "black" | "average" | "blur" | "gradient"

const BORDER_RATIOS = [
  { label: "1:1", value: "1:1" },
  { label: "4:3", value: "4:3" },
  { label: "3:2", value: "3:2" },
  { label: "16:9", value: "16:9" },
  { label: "9:16", value: "9:16" },
  { label: "2:1", value: "2:1" },
  { label: "5:4", value: "5:4" },
  { label: "3:4", value: "3:4" },
  { label: "4:5", value: "4:5" },
  { label: "21:9", value: "21:9" },
]

interface BorderModeProps {
  image: HTMLImageElement | null
}

export function BorderMode({ image }: BorderModeProps) {
  if (!image) {
    return null
  }
  const [selectedRatio, setSelectedRatio] = useState("1:1")
  const [customW, setCustomW] = useState("16")
  const [customH, setCustomH] = useState("9")
  const [borderStyle, setBorderStyle] = useState<BorderStyle>("black")
  const [copiedMessage, setCopiedMessage] = useState(false)
  const [isCustom, setIsCustom] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasDisplaySize, setCanvasDisplaySize] = useState({ width: 0, height: 0 })

  // Parse the active target ratio
  const targetW = isCustom ? (parseInt(customW) || 1) : parseInt(selectedRatio.split(":")[0])
  const targetH = isCustom ? (parseInt(customH) || 1) : parseInt(selectedRatio.split(":")[1])

  // Check if ratio already matches
  const exact = image ? getExactRatio(image.width, image.height) : null
  const currentDecimal = image ? image.width / image.height : 0
  const targetDecimal = targetW / targetH
  const isExactMatch = image ? Math.abs(currentDecimal - targetDecimal) < 0.001 : false

  // Render preview canvas
  useEffect(() => {
    if (!image || !containerRef.current) return

    const border = getBorderDimensions(image.width, image.height, targetW, targetH)

    // Calculate display size that fits the container
    const maxWidth = containerRef.current.clientWidth
    const maxHeight = Math.min(window.innerHeight * 0.5, 500)
    const outputRatio = border.canvasWidth / border.canvasHeight

    let displayWidth: number
    let displayHeight: number

    if (outputRatio > maxWidth / maxHeight) {
      displayWidth = maxWidth
      displayHeight = maxWidth / outputRatio
    } else {
      displayHeight = maxHeight
      displayWidth = maxHeight * outputRatio
    }

    setCanvasDisplaySize({
      width: Math.round(displayWidth),
      height: Math.round(displayHeight),
    })

    const canvas = canvasRef.current
    if (!canvas) return

    // Use full resolution for the internal canvas
    canvas.width = border.canvasWidth
    canvas.height = border.canvasHeight

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Fill background based on border style
    if (borderStyle === "black") {
      ctx.fillStyle = "#000000"
      ctx.fillRect(0, 0, border.canvasWidth, border.canvasHeight)
    } else if (borderStyle === "average") {
      const avg = getAverageEdgeColor(image)
      ctx.fillStyle = `rgb(${avg.r}, ${avg.g}, ${avg.b})`
      ctx.fillRect(0, 0, border.canvasWidth, border.canvasHeight)
    } else if (borderStyle === "blur") {
      // Draw stretched/blurred version as background
      ctx.save()
      ctx.filter = "blur(40px)"
      ctx.drawImage(image, -20, -20, border.canvasWidth + 40, border.canvasHeight + 40)
      ctx.restore()
      // Darken slightly for contrast
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)"
      ctx.fillRect(0, 0, border.canvasWidth, border.canvasHeight)
    } else if (borderStyle === "gradient") {
      const avg = getAverageEdgeColor(image)
      const grad = ctx.createLinearGradient(0, 0, 0, border.canvasHeight)
      grad.addColorStop(0, `rgb(${avg.r}, ${avg.g}, ${avg.b})`)
      grad.addColorStop(0.5, `rgba(${avg.r}, ${avg.g}, ${avg.b}, 0.6)`)
      grad.addColorStop(1, "#000000")
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, border.canvasWidth, border.canvasHeight)
    }

    // Draw the original image centered
    ctx.drawImage(image, border.imgX, border.imgY, image.width, image.height)
  }, [image, targetW, targetH, borderStyle])

  // Resize handler
  useEffect(() => {
    if (!image) return
    const handleResize = () => {
      // Trigger re-render by updating a dependency - the useEffect above will recalculate
      setCanvasDisplaySize((prev) => ({ ...prev }))
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [image])

  const generateOutputCanvas = useCallback((): HTMLCanvasElement | null => {
    if (!image) return null
    const border = getBorderDimensions(image.width, image.height, targetW, targetH)
    const canvas = document.createElement("canvas")
    canvas.width = border.canvasWidth
    canvas.height = border.canvasHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    if (borderStyle === "black") {
      ctx.fillStyle = "#000000"
      ctx.fillRect(0, 0, border.canvasWidth, border.canvasHeight)
    } else if (borderStyle === "average") {
      const avg = getAverageEdgeColor(image)
      ctx.fillStyle = `rgb(${avg.r}, ${avg.g}, ${avg.b})`
      ctx.fillRect(0, 0, border.canvasWidth, border.canvasHeight)
    } else if (borderStyle === "blur") {
      ctx.save()
      ctx.filter = "blur(40px)"
      ctx.drawImage(image, -20, -20, border.canvasWidth + 40, border.canvasHeight + 40)
      ctx.restore()
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)"
      ctx.fillRect(0, 0, border.canvasWidth, border.canvasHeight)
    } else if (borderStyle === "gradient") {
      const avg = getAverageEdgeColor(image)
      const grad = ctx.createLinearGradient(0, 0, 0, border.canvasHeight)
      grad.addColorStop(0, `rgb(${avg.r}, ${avg.g}, ${avg.b})`)
      grad.addColorStop(0.5, `rgba(${avg.r}, ${avg.g}, ${avg.b}, 0.6)`)
      grad.addColorStop(1, "#000000")
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, border.canvasWidth, border.canvasHeight)
    }

    ctx.drawImage(image, border.imgX, border.imgY, image.width, image.height)
    return canvas
  }, [image, targetW, targetH, borderStyle])

  const handleCopyToClipboard = useCallback(async () => {
    const canvas = generateOutputCanvas()
    if (!canvas) return

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      )
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ])
        setCopiedMessage(true)
        setTimeout(() => setCopiedMessage(false), 2500)
      }
    } catch {
      // Fallback to download
      handleDownload()
    }
  }, [generateOutputCanvas])

  const handleDownload = useCallback(() => {
    const canvas = generateOutputCanvas()
    if (!canvas) return

    const link = document.createElement("a")
    link.download = `bordered-${targetW}x${targetH}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }, [generateOutputCanvas, targetW, targetH])



  const border = getBorderDimensions(image.width, image.height, targetW, targetH)

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="flex flex-col gap-4">
        {/* Current ratio display */}
        {exact && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current</span>
              <span className="font-mono text-xl font-bold text-foreground">
                {exact.display}
              </span>
              <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                {exact.decimal.toFixed(4)}
              </Badge>
            </div>
            <span className="text-border">|</span>
            <span className="text-sm text-muted-foreground font-mono">
              {exact.width} x {exact.height}px
            </span>
          </div>
        )}

        {/* Target ratio selection */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm text-muted-foreground">Target Ratio</Label>
            <Select
              value={isCustom ? "custom" : selectedRatio}
              onValueChange={(val) => {
                if (val === "custom") {
                  setIsCustom(true)
                } else {
                  setIsCustom(false)
                  setSelectedRatio(val)
                }
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BORDER_RATIOS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isCustom && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={100}
                value={customW}
                onChange={(e) => setCustomW(e.target.value)}
                className="w-16 font-mono text-center"
                aria-label="Custom width ratio"
              />
              <span className="text-muted-foreground font-mono font-bold">:</span>
              <Input
                type="number"
                min={1}
                max={100}
                value={customH}
                onChange={(e) => setCustomH(e.target.value)}
                className="w-16 font-mono text-center"
                aria-label="Custom height ratio"
              />
            </div>
          )}

          {isExactMatch && (
            <div className="flex items-center gap-1.5 text-sm text-primary">
              <AlertCircle className="size-3.5" />
              <span>Already this ratio -- no borders needed</span>
            </div>
          )}
        </div>

        {/* Border style */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm text-muted-foreground">Border Style</Label>
          <RadioGroup
            value={borderStyle}
            onValueChange={(val) => setBorderStyle(val as BorderStyle)}
            className="flex flex-wrap gap-4"
          >
            {([
              { value: "black", label: "Black" },
              { value: "average", label: "Avg Color" },
              { value: "blur", label: "Blur" },
              { value: "gradient", label: "Gradient" },
            ] as const).map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <RadioGroupItem value={opt.value} id={`border-${opt.value}`} />
                <Label htmlFor={`border-${opt.value}`} className="cursor-pointer text-sm text-foreground">
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Output info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <Frame className="size-3.5" />
          Output: {border.canvasWidth} x {border.canvasHeight}px
          {(border.borderTop > 0 || border.borderLeft > 0) && (
            <>
              <span className="text-border">|</span>
              {border.borderTop > 0 && <span>Top/Bottom: {border.borderTop}px</span>}
              {border.borderLeft > 0 && <span>Left/Right: {border.borderLeft}px</span>}
            </>
          )}
        </div>
      </div>

      {/* Canvas Preview */}
      <div ref={containerRef} className="relative flex items-center justify-center w-full">
        <canvas
          ref={canvasRef}
          className="rounded-lg"
          style={{
            width: canvasDisplaySize.width || "auto",
            height: canvasDisplaySize.height || "auto",
          }}
          aria-label={`Border preview: ${border.canvasWidth}x${border.canvasHeight} pixels`}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <Button onClick={handleCopyToClipboard} className="gap-2">
          <Copy className="size-4" />
          Copy to Clipboard
        </Button>
        <Button variant="outline" onClick={handleDownload} className="gap-2">
          <Download className="size-4" />
          Download PNG
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-muted-foreground">
          <RotateCcw className="size-4" />
          Reset
        </Button>
      </div>

      {/* Copied toast */}
      {copiedMessage && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="size-4" />
          Bordered image copied to clipboard
        </div>
      )}
    </div>
  )
}
