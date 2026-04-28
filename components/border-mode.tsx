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
  Copy,
  Download,
  CheckCircle2,
  Frame,
  AlertCircle,
  Pipette,
} from "lucide-react"

export type BorderStyle = "black" | "white" | "color" | "average" | "blur" | "gradient"

// Extend Window to include the EyeDropper API
declare global {
  interface Window {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> }
  }
}

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

function normalizeHexInput(value: string) {
  return value.trim().replace(/^#/, "").replace(/[^0-9a-fA-F]/g, "").slice(0, 6)
}

function expandShortHex(value: string) {
  return value.length === 3 ? value.split("").map((char) => char + char).join("") : value
}

interface BorderModeProps {
  image: HTMLImageElement | null
}

export function BorderMode({ image }: BorderModeProps) {
  const [selectedRatio, setSelectedRatio] = useState("1:1")
  const [customW, setCustomW] = useState("16")
  const [customH, setCustomH] = useState("9")
  const [borderStyle, setBorderStyle] = useState<BorderStyle>("black")
  const [copiedMessage, setCopiedMessage] = useState(false)
  const [isCustom, setIsCustom] = useState(false)
  const [customColor, setCustomColor] = useState("#ffffff")
  const [customColorInput, setCustomColorInput] = useState("ffffff")
  const [debouncedColor, setDebouncedColor] = useState("#ffffff")
  const [eyedropperSupported] = useState(() => typeof window !== "undefined" && !!window.EyeDropper)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasDisplaySize, setCanvasDisplaySize] = useState({ width: 0, height: 0 })

  // Debounce custom color to avoid re-rendering canvas on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedColor(customColor), 120)
    return () => clearTimeout(timer)
  }, [customColor])

  if (!image) return null

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
    } else if (borderStyle === "white") {
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, border.canvasWidth, border.canvasHeight)
    } else if (borderStyle === "color") {
      ctx.fillStyle = debouncedColor
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
  }, [image, targetW, targetH, borderStyle, debouncedColor])

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
    } else if (borderStyle === "white") {
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, border.canvasWidth, border.canvasHeight)
    } else if (borderStyle === "color") {
      ctx.fillStyle = debouncedColor
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
  }, [image, targetW, targetH, borderStyle, debouncedColor])

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

  const handleEyedropper = useCallback(async () => {
    if (!window.EyeDropper) return
    try {
      const dropper = new window.EyeDropper()
      const result = await dropper.open()
      setCustomColor(result.sRGBHex)
      setCustomColorInput(result.sRGBHex.slice(1))
      setBorderStyle("color")
    } catch {
      // User cancelled the eyedropper
    }
  }, [])

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
            className="flex flex-wrap gap-x-5 gap-y-3"
          >
            {([
              { value: "black", label: "Black" },
              { value: "white", label: "White" },
              { value: "average", label: "Avg Color" },
              { value: "blur", label: "Blur" },
              { value: "gradient", label: "Gradient" },
              { value: "color", label: "Custom Color" },
            ] as const).map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <RadioGroupItem value={opt.value} id={`border-${opt.value}`} />
                <Label htmlFor={`border-${opt.value}`} className="cursor-pointer text-sm text-foreground">
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {/* Color picker row — shown when "color" is active */}
          {borderStyle === "color" && (
            <div className="mt-1 flex items-center gap-2">
              {/* Native color input styled as a swatch */}
              <div className="relative size-8 shrink-0 overflow-hidden rounded-md border border-border">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value)
                    setCustomColorInput(e.target.value.slice(1))
                  }}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                  aria-label="Pick border color"
                />
                <div
                  className="size-full rounded-md"
                  style={{ backgroundColor: customColor }}
                  aria-hidden="true"
                />
              </div>

              {/* Hex text input */}
              <Input
                type="text"
                value={customColorInput}
                onChange={(e) => {
                  const normalized = normalizeHexInput(e.target.value)
                  setCustomColorInput(normalized)
                  if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
                    setCustomColor(`#${normalized.toLowerCase()}`)
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault()
                  const normalized = expandShortHex(normalizeHexInput(e.clipboardData.getData("text")))
                  setCustomColorInput(normalized)
                  if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
                    setCustomColor(`#${normalized.toLowerCase()}`)
                  }
                }}
                onBlur={() => setCustomColorInput(customColor.slice(1))}
                className="w-28 font-mono text-sm uppercase"
                placeholder="FFFFFF"
                aria-label="Border color hex value"
              />

              {/* Eyedropper button — only shown when API is supported */}
              {eyedropperSupported && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEyedropper}
                  className="gap-1.5"
                  title="Pick color from screen"
                >
                  <Pipette className="size-3.5" />
                  Pick from screen
                </Button>
              )}
            </div>
          )}
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
