"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  CheckCircle2,
  Copy,
  Download,
  ImageDown,
  Link2,
  RotateCcw,
} from "lucide-react"

interface ResizeModeProps {
  image: HTMLImageElement
}

type OutputFormat = "png" | "jpeg"

const SCALE_PRESETS = [25, 50, 75, 100, 200]
const MIN_DIMENSION = 1
const MAX_DIMENSION = 20000

function clampDimension(value: number) {
  if (!Number.isFinite(value)) return MIN_DIMENSION
  return Math.min(MAX_DIMENSION, Math.max(MIN_DIMENSION, Math.round(value)))
}

function parseDimension(value: string) {
  return clampDimension(Number(value))
}

function calculateDisplaySize(
  containerWidth: number,
  width: number,
  height: number
) {
  const maxWidth = containerWidth
  const maxHeight = Math.min(window.innerHeight * 0.55, 520)
  const ratio = width / height

  if (ratio > maxWidth / maxHeight) {
    return {
      width: Math.round(maxWidth),
      height: Math.round(maxWidth / ratio),
    }
  }

  return {
    width: Math.round(maxHeight * ratio),
    height: Math.round(maxHeight),
  }
}

export function ResizeMode({ image }: ResizeModeProps) {
  const [widthInput, setWidthInput] = useState(() => String(image.width))
  const [heightInput, setHeightInput] = useState(() => String(image.height))
  const [lockAspectRatio, setLockAspectRatio] = useState(true)
  const [format, setFormat] = useState<OutputFormat>("png")
  const [jpegQuality, setJpegQuality] = useState(92)
  const [copiedMessage, setCopiedMessage] = useState(false)
  const [canvasDisplaySize, setCanvasDisplaySize] = useState({ width: 0, height: 0 })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const aspectRatio = image.width / image.height
  const outputWidth = parseDimension(widthInput)
  const outputHeight = parseDimension(heightInput)
  const mimeType = format === "png" ? "image/png" : "image/jpeg"
  const quality = format === "jpeg" ? jpegQuality / 100 : undefined

  useEffect(() => {
    setWidthInput(String(image.width))
    setHeightInput(String(image.height))
    setLockAspectRatio(true)
    setFormat("png")
    setJpegQuality(92)
  }, [image])

  const renderToCanvas = useCallback(
    (canvas: HTMLCanvasElement, width: number, height: number) => {
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d")
      if (!ctx) return false

      ctx.clearRect(0, 0, width, height)
      if (format === "jpeg") {
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, width, height)
      }
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(image, 0, 0, width, height)
      return true
    },
    [format, image]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    renderToCanvas(canvas, outputWidth, outputHeight)
    setCanvasDisplaySize(
      calculateDisplaySize(container.clientWidth, outputWidth, outputHeight)
    )
  }, [outputHeight, outputWidth, renderToCanvas])

  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current
      if (!container) return
      setCanvasDisplaySize(
        calculateDisplaySize(container.clientWidth, outputWidth, outputHeight)
      )
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [outputHeight, outputWidth])

  const generateOutputCanvas = useCallback((): HTMLCanvasElement | null => {
    const canvas = document.createElement("canvas")
    return renderToCanvas(canvas, outputWidth, outputHeight) ? canvas : null
  }, [outputHeight, outputWidth, renderToCanvas])

  const updateWidth = useCallback(
    (value: string) => {
      setWidthInput(value)
      if (!lockAspectRatio) return
      const nextWidth = Number(value)
      if (!Number.isFinite(nextWidth) || nextWidth <= 0) return
      setHeightInput(String(clampDimension(nextWidth / aspectRatio)))
    },
    [aspectRatio, lockAspectRatio]
  )

  const updateHeight = useCallback(
    (value: string) => {
      setHeightInput(value)
      if (!lockAspectRatio) return
      const nextHeight = Number(value)
      if (!Number.isFinite(nextHeight) || nextHeight <= 0) return
      setWidthInput(String(clampDimension(nextHeight * aspectRatio)))
    },
    [aspectRatio, lockAspectRatio]
  )

  const applyScale = useCallback(
    (scale: number) => {
      setWidthInput(String(clampDimension(image.width * (scale / 100))))
      setHeightInput(String(clampDimension(image.height * (scale / 100))))
    },
    [image]
  )

  const handleReset = useCallback(() => {
    setWidthInput(String(image.width))
    setHeightInput(String(image.height))
    setLockAspectRatio(true)
  }, [image])

  const handleCopy = useCallback(async () => {
    const canvas = generateOutputCanvas()
    if (!canvas) return

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, mimeType, quality)
      )
      if (!blob) return
      await navigator.clipboard.write([new ClipboardItem({ [mimeType]: blob })])
      setCopiedMessage(true)
      setTimeout(() => setCopiedMessage(false), 2500)
    } catch {
      const link = document.createElement("a")
      link.download = `resized-${outputWidth}x${outputHeight}.${format}`
      link.href = canvas.toDataURL(mimeType, quality)
      link.click()
    }
  }, [format, generateOutputCanvas, mimeType, outputHeight, outputWidth, quality])

  const handleDownload = useCallback(() => {
    const canvas = generateOutputCanvas()
    if (!canvas) return

    const link = document.createElement("a")
    link.download = `resized-${outputWidth}x${outputHeight}.${format}`
    link.href = canvas.toDataURL(mimeType, quality)
    link.click()
  }, [format, generateOutputCanvas, mimeType, outputHeight, outputWidth, quality])

  const activeScale = Math.round((outputWidth / image.width) * 100)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Original</span>
            <span className="font-mono text-xl font-bold text-foreground">
              {image.width} x {image.height}
            </span>
            <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
              px
            </Badge>
          </div>
          <span className="text-border">|</span>
          <span className="text-sm text-muted-foreground font-mono">
            Output: {outputWidth} x {outputHeight}px
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-sm text-muted-foreground">Quick Scale</Label>
          <div className="flex flex-wrap gap-2">
            {SCALE_PRESETS.map((scale) => (
              <Button
                key={scale}
                type="button"
                variant={activeScale === scale ? "default" : "outline"}
                size="sm"
                onClick={() => applyScale(scale)}
                className="font-mono"
              >
                {scale}%
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resize-width" className="text-sm text-muted-foreground">
              Width
            </Label>
            <Input
              id="resize-width"
              type="number"
              min={MIN_DIMENSION}
              max={MAX_DIMENSION}
              value={widthInput}
              onChange={(e) => updateWidth(e.target.value)}
              onBlur={() => setWidthInput(String(outputWidth))}
              className="font-mono"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resize-height" className="text-sm text-muted-foreground">
              Height
            </Label>
            <Input
              id="resize-height"
              type="number"
              min={MIN_DIMENSION}
              max={MAX_DIMENSION}
              value={heightInput}
              onChange={(e) => updateHeight(e.target.value)}
              onBlur={() => setHeightInput(String(outputHeight))}
              className="font-mono"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-1.5 justify-self-start text-muted-foreground sm:mb-0.5"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="resize-lock-aspect"
                checked={lockAspectRatio}
                onCheckedChange={setLockAspectRatio}
              />
              <Label
                htmlFor="resize-lock-aspect"
                className="flex cursor-pointer items-center gap-1.5 text-sm text-foreground"
              >
                <Link2 className="size-3.5" />
                Lock aspect ratio
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Format</Label>
              <Select value={format} onValueChange={(value) => setFormat(value as OutputFormat)}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="jpeg">JPEG</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {format === "jpeg" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">JPEG Quality</Label>
                <span className="font-mono text-sm text-foreground">{jpegQuality}%</span>
              </div>
              <Slider
                min={10}
                max={100}
                step={1}
                value={[jpegQuality]}
                onValueChange={([value]) => setJpegQuality(value)}
                aria-label="JPEG quality"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <ImageDown className="size-3.5" />
          Export: {outputWidth} x {outputHeight}px
          <span className="text-border">|</span>
          <span>{format.toUpperCase()}{format === "jpeg" ? ` ${jpegQuality}%` : ""}</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary/30"
        style={{ minHeight: 220 }}
      >
        <canvas
          ref={canvasRef}
          className="block rounded-md"
          style={{
            width: canvasDisplaySize.width || "auto",
            height: canvasDisplaySize.height || "auto",
          }}
          aria-label={`Resize preview: ${outputWidth}x${outputHeight} pixels`}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleCopy} className="gap-2">
          <Copy className="size-4" />
          Copy {format.toUpperCase()}
        </Button>
        <Button variant="outline" onClick={handleDownload} className="gap-2">
          <Download className="size-4" />
          Download {format.toUpperCase()}
        </Button>
      </div>

      {copiedMessage && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="size-4" />
          Resized image copied to clipboard
        </div>
      )}
    </div>
  )
}
