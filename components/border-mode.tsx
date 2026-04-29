"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
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
} from "@/lib/ratio-utils"
import {
  Copy,
  Download,
  CheckCircle2,
  Frame,
  AlertCircle,
  Pipette,
  ImageIcon,
  Upload,
  X,
} from "lucide-react"

export type BorderStyle =
  | "black"
  | "white"
  | "color"
  | "average"
  | "blur"
  | "gradient"
  | "preset"
  | "image"

type PresetId =
  | "glaze"
  | "aurora"
  | "chromatic"
  | "ember"
  | "moonrise"
  | "peach"
  | "prism"
  | "midnight"
  | "blossom"
  | "rain"
  | "monoDark"
  | "monoLight"
type BorderModeVariant = "fill" | "padding"

interface SavedGradient {
  start: string
  end: string
  angle: number
}

interface BorderLayout {
  canvasWidth: number
  canvasHeight: number
  imgX: number
  imgY: number
  ratioBorderTop: number
  ratioBorderLeft: number
  padding: number
}

interface BackgroundUpload {
  image: HTMLImageElement
  url: string
  name: string
}

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

const BACKGROUND_PRESETS: Array<{ id: PresetId; label: string; swatch: string }> = [
  { id: "glaze", label: "Glaze", swatch: "radial-gradient(circle at 16% 12%,#ffffff 0,#ffe0ff 12%,transparent 30%),radial-gradient(circle at 72% 24%,#5efcff,transparent 34%),linear-gradient(135deg,#ff4fd8,#6f3cff 48%,#111827)" },
  { id: "aurora", label: "Aurora", swatch: "radial-gradient(circle at 20% 72%,#27f5a9,transparent 36%),radial-gradient(circle at 74% 26%,#7c3cff,transparent 38%),linear-gradient(135deg,#07111f,#123a6f 52%,#0a0b18)" },
  { id: "chromatic", label: "Chromatic", swatch: "radial-gradient(circle at 24% 18%,#ff2d55,transparent 32%),radial-gradient(circle at 68% 30%,#00d4ff,transparent 36%),radial-gradient(circle at 46% 78%,#ffe45e,transparent 34%),linear-gradient(135deg,#101828,#0b1024)" },
  { id: "ember", label: "Ember", swatch: "radial-gradient(circle at 72% 18%,#ffd166,transparent 34%),radial-gradient(circle at 18% 80%,#ff006e,transparent 40%),linear-gradient(135deg,#451414,#ef476f 42%,#27133f)" },
  { id: "moonrise", label: "Moonrise", swatch: "radial-gradient(circle at 82% 18%,#f8fafc,transparent 16%),radial-gradient(circle at 24% 70%,#818cf8,transparent 38%),linear-gradient(135deg,#111827,#3730a3 52%,#020617)" },
  { id: "peach", label: "Peach", swatch: "radial-gradient(circle at 72% 22%,#fff7ad,transparent 34%),radial-gradient(circle at 18% 72%,#fb7185,transparent 38%),linear-gradient(135deg,#fed7aa,#f472b6 48%,#7c3aed)" },
  { id: "prism", label: "Prism", swatch: "radial-gradient(circle at 18% 20%,#22d3ee,transparent 30%),radial-gradient(circle at 76% 18%,#f0abfc,transparent 34%),radial-gradient(circle at 60% 82%,#bef264,transparent 36%),linear-gradient(135deg,#f8fafc,#c7d2fe)" },
  { id: "midnight", label: "Midnight", swatch: "radial-gradient(circle at 18% 16%,#38bdf8,transparent 34%),radial-gradient(circle at 82% 76%,#a855f7,transparent 42%),linear-gradient(135deg,#020617,#111827 54%,#172554)" },
  { id: "blossom", label: "Blossom", swatch: "radial-gradient(circle at 18% 24%,#f9a8d4,transparent 36%),radial-gradient(circle at 80% 20%,#fde68a,transparent 34%),radial-gradient(circle at 62% 82%,#c4b5fd,transparent 40%),linear-gradient(135deg,#fff1f2,#fdf2f8)" },
  { id: "rain", label: "Bright Rain", swatch: "radial-gradient(circle at 22% 18%,#67e8f9,transparent 34%),radial-gradient(circle at 78% 30%,#f472b6,transparent 36%),radial-gradient(circle at 44% 82%,#facc15,transparent 38%),linear-gradient(135deg,#2563eb,#7c3aed)" },
  { id: "monoDark", label: "Mono Dark", swatch: "radial-gradient(circle at 22% 20%,#64748b,transparent 38%),radial-gradient(circle at 76% 72%,#334155,transparent 42%),linear-gradient(135deg,#020617,#111827 52%,#1e293b)" },
  { id: "monoLight", label: "Mono Light", swatch: "radial-gradient(circle at 20% 24%,#ffffff,transparent 34%),radial-gradient(circle at 74% 70%,#cbd5e1,transparent 44%),linear-gradient(135deg,#f8fafc,#e2e8f0 52%,#cbd5e1)" },
]

function normalizeHexInput(value: string) {
  return value.trim().replace(/^#/, "").replace(/[^0-9a-fA-F]/g, "").slice(0, 6)
}

function expandShortHex(value: string) {
  return value.length === 3 ? value.split("").map((char) => char + char).join("") : value
}

function isFullHex(value: string) {
  return /^[0-9a-fA-F]{6}$/.test(value)
}

const RECENT_COLORS_KEY = "image-ratio-tool:recent-colors"
const RECENT_GRADIENTS_KEY = "image-ratio-tool:recent-gradients"
const RECENT_LIMIT = 5

function normalizeHexColor(color: string) {
  const normalized = normalizeHexInput(color)
  return isFullHex(normalized) ? `#${normalized.toLowerCase()}` : null
}

function normalizeAngle(angle: number) {
  return ((Math.round(angle) % 360) + 360) % 360
}

function readRecentColors() {
  if (typeof window === "undefined") return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_COLORS_KEY) ?? "[]")
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => typeof item === "string" ? normalizeHexColor(item) : null)
      .filter((item): item is string => !!item)
      .slice(0, RECENT_LIMIT)
  } catch {
    return []
  }
}

function readRecentGradients() {
  if (typeof window === "undefined") return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_GRADIENTS_KEY) ?? "[]")
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item): SavedGradient | null => {
        if (!item || typeof item !== "object") return null
        const start = normalizeHexColor("start" in item ? String(item.start) : "")
        const end = normalizeHexColor("end" in item ? String(item.end) : "")
        const angle = "angle" in item ? Number(item.angle) : NaN
        if (!start || !end || !Number.isFinite(angle)) return null
        return { start, end, angle: normalizeAngle(angle) }
      })
      .filter((item): item is SavedGradient => !!item)
      .slice(0, RECENT_LIMIT)
  } catch {
    return []
  }
}

function getPresentationBorderDimensions(
  imgWidth: number,
  imgHeight: number,
  targetW: number,
  targetH: number,
  paddingPercent: number
): BorderLayout {
  const base = getBorderDimensions(imgWidth, imgHeight, targetW, targetH)
  const targetRatio = targetW / targetH
  const padding = Math.round(Math.max(imgWidth, imgHeight) * (paddingPercent / 100))

  let canvasWidth = base.canvasWidth + padding * 2
  let canvasHeight = base.canvasHeight + padding * 2

  if (canvasWidth / canvasHeight > targetRatio) {
    canvasHeight = Math.round(canvasWidth / targetRatio)
  } else if (canvasWidth / canvasHeight < targetRatio) {
    canvasWidth = Math.round(canvasHeight * targetRatio)
  }

  return {
    canvasWidth,
    canvasHeight,
    imgX: Math.round((canvasWidth - imgWidth) / 2),
    imgY: Math.round((canvasHeight - imgHeight) / 2),
    ratioBorderTop: base.borderTop,
    ratioBorderLeft: base.borderLeft,
    padding,
  }
}

function getUniformPaddingDimensions(
  imgWidth: number,
  imgHeight: number,
  paddingPercent: number
): BorderLayout {
  const padding = Math.round(Math.max(imgWidth, imgHeight) * (paddingPercent / 100))
  const canvasWidth = imgWidth + padding * 2
  const canvasHeight = imgHeight + padding * 2

  return {
    canvasWidth,
    canvasHeight,
    imgX: padding,
    imgY: padding,
    ratioBorderTop: 0,
    ratioBorderLeft: 0,
    padding,
  }
}

function getFillBorderLayout(
  imgWidth: number,
  imgHeight: number,
  targetW: number,
  targetH: number
): BorderLayout {
  const base = getBorderDimensions(imgWidth, imgHeight, targetW, targetH)

  return {
    canvasWidth: base.canvasWidth,
    canvasHeight: base.canvasHeight,
    imgX: base.imgX,
    imgY: base.imgY,
    ratioBorderTop: base.borderTop,
    ratioBorderLeft: base.borderLeft,
    padding: 0,
  }
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawImageCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
}

function createAngleGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  angle: number,
  startColor: string,
  endColor: string
) {
  const radians = ((angle - 90) * Math.PI) / 180
  const x = Math.cos(radians)
  const y = Math.sin(radians)
  const half = Math.sqrt(width * width + height * height) / 2
  const centerX = width / 2
  const centerY = height / 2
  const gradient = ctx.createLinearGradient(
    centerX - x * half,
    centerY - y * half,
    centerX + x * half,
    centerY + y * half
  )
  gradient.addColorStop(0, startColor)
  gradient.addColorStop(1, endColor)
  return gradient
}

function fillBase(ctx: CanvasRenderingContext2D, width: number, height: number, colors: [string, string, string], angle = 135) {
  const gradient = createAngleGradient(ctx, width, height, angle, colors[0], colors[2])
  gradient.addColorStop(0.52, colors[1])
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

function fillRadial(ctx: CanvasRenderingContext2D, width: number, height: number, x: number, y: number, radius: number, color: string) {
  const cx = width * x
  const cy = height * y
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * radius)
  gradient.addColorStop(0, color)
  gradient.addColorStop(1, "rgba(255,255,255,0)")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

function drawPresetBackground(ctx: CanvasRenderingContext2D, preset: PresetId, width: number, height: number) {
  if (preset === "glaze") {
    fillBase(ctx, width, height, ["#ff4fd8", "#6f3cff", "#111827"])
    fillRadial(ctx, width, height, 0.16, 0.12, 0.42, "rgba(255,255,255,0.82)")
    fillRadial(ctx, width, height, 0.72, 0.24, 0.46, "rgba(94,252,255,0.78)")
    fillRadial(ctx, width, height, 0.42, 0.88, 0.38, "rgba(255,92,168,0.5)")
    return
  }

  if (preset === "aurora") {
    fillBase(ctx, width, height, ["#07111f", "#123a6f", "#0a0b18"], 130)
    fillRadial(ctx, width, height, 0.2, 0.72, 0.52, "rgba(39,245,169,0.72)")
    fillRadial(ctx, width, height, 0.74, 0.26, 0.52, "rgba(124,60,255,0.82)")
    fillRadial(ctx, width, height, 0.52, 0.46, 0.36, "rgba(56,189,248,0.42)")
    return
  }

  if (preset === "chromatic") {
    fillBase(ctx, width, height, ["#101828", "#0b1024", "#020617"], 150)
    fillRadial(ctx, width, height, 0.24, 0.18, 0.44, "rgba(255,45,85,0.82)")
    fillRadial(ctx, width, height, 0.68, 0.3, 0.46, "rgba(0,212,255,0.78)")
    fillRadial(ctx, width, height, 0.46, 0.78, 0.44, "rgba(255,228,94,0.56)")
    return
  }

  if (preset === "ember") {
    fillBase(ctx, width, height, ["#451414", "#ef476f", "#27133f"], 132)
    fillRadial(ctx, width, height, 0.72, 0.18, 0.46, "rgba(255,209,102,0.86)")
    fillRadial(ctx, width, height, 0.18, 0.8, 0.54, "rgba(255,0,110,0.78)")
    return
  }

  if (preset === "moonrise") {
    fillBase(ctx, width, height, ["#111827", "#3730a3", "#020617"], 136)
    fillRadial(ctx, width, height, 0.82, 0.18, 0.22, "rgba(248,250,252,0.78)")
    fillRadial(ctx, width, height, 0.24, 0.7, 0.48, "rgba(129,140,248,0.68)")
    return
  }

  if (preset === "peach") {
    fillBase(ctx, width, height, ["#fed7aa", "#f472b6", "#7c3aed"], 136)
    fillRadial(ctx, width, height, 0.72, 0.22, 0.44, "rgba(255,247,173,0.84)")
    fillRadial(ctx, width, height, 0.18, 0.72, 0.48, "rgba(251,113,133,0.66)")
    return
  }

  if (preset === "prism") {
    fillBase(ctx, width, height, ["#f8fafc", "#c7d2fe", "#a5f3fc"], 138)
    fillRadial(ctx, width, height, 0.18, 0.2, 0.42, "rgba(34,211,238,0.7)")
    fillRadial(ctx, width, height, 0.76, 0.18, 0.44, "rgba(240,171,252,0.72)")
    fillRadial(ctx, width, height, 0.6, 0.82, 0.44, "rgba(190,242,100,0.62)")
    return
  }

  if (preset === "midnight") {
    fillBase(ctx, width, height, ["#020617", "#111827", "#172554"], 140)
    fillRadial(ctx, width, height, 0.18, 0.16, 0.5, "rgba(56,189,248,0.58)")
    fillRadial(ctx, width, height, 0.82, 0.76, 0.58, "rgba(168,85,247,0.64)")
    return
  }

  if (preset === "blossom") {
    fillBase(ctx, width, height, ["#fff1f2", "#fdf2f8", "#ddd6fe"], 130)
    fillRadial(ctx, width, height, 0.18, 0.24, 0.48, "rgba(249,168,212,0.78)")
    fillRadial(ctx, width, height, 0.8, 0.2, 0.46, "rgba(253,230,138,0.72)")
    fillRadial(ctx, width, height, 0.62, 0.82, 0.5, "rgba(196,181,253,0.66)")
    return
  }

  if (preset === "rain") {
    fillBase(ctx, width, height, ["#2563eb", "#7c3aed", "#db2777"], 132)
    fillRadial(ctx, width, height, 0.22, 0.18, 0.46, "rgba(103,232,249,0.78)")
    fillRadial(ctx, width, height, 0.78, 0.3, 0.48, "rgba(244,114,182,0.72)")
    fillRadial(ctx, width, height, 0.44, 0.82, 0.5, "rgba(250,204,21,0.62)")
    return
  }

  if (preset === "monoDark") {
    fillBase(ctx, width, height, ["#020617", "#111827", "#1e293b"], 138)
    fillRadial(ctx, width, height, 0.22, 0.2, 0.52, "rgba(100,116,139,0.58)")
    fillRadial(ctx, width, height, 0.76, 0.72, 0.56, "rgba(51,65,85,0.72)")
    return
  }

  fillBase(ctx, width, height, ["#f8fafc", "#e2e8f0", "#cbd5e1"], 135)
  fillRadial(ctx, width, height, 0.2, 0.24, 0.46, "rgba(255,255,255,0.86)")
  fillRadial(ctx, width, height, 0.74, 0.7, 0.58, "rgba(148,163,184,0.48)")
}

interface BorderModeProps {
  image: HTMLImageElement | null
  variant?: BorderModeVariant
}

export function BorderMode({ image, variant = "fill" }: BorderModeProps) {
  const [selectedRatio, setSelectedRatio] = useState("1:1")
  const [customW, setCustomW] = useState("16")
  const [customH, setCustomH] = useState("9")
  const [useCustomPaddingRatio, setUseCustomPaddingRatio] = useState(false)
  const [borderStyle, setBorderStyle] = useState<BorderStyle>("preset")
  const [selectedPreset, setSelectedPreset] = useState<PresetId>("glaze")
  const [paddingPercent, setPaddingPercent] = useState(8)
  const [cornerPercent, setCornerPercent] = useState(4)
  const [backgroundUpload, setBackgroundUpload] = useState<BackgroundUpload | null>(null)
  const [copiedMessage, setCopiedMessage] = useState(false)
  const [isCustom, setIsCustom] = useState(false)
  const [customColor, setCustomColor] = useState("#ffffff")
  const [customColorInput, setCustomColorInput] = useState("ffffff")
  const [debouncedColor, setDebouncedColor] = useState("#ffffff")
  const [gradientStartColor, setGradientStartColor] = useState("#ff4fd8")
  const [gradientEndColor, setGradientEndColor] = useState("#4f46ff")
  const [gradientStartInput, setGradientStartInput] = useState("ff4fd8")
  const [gradientEndInput, setGradientEndInput] = useState("4f46ff")
  const [debouncedGradientStart, setDebouncedGradientStart] = useState("#ff4fd8")
  const [debouncedGradientEnd, setDebouncedGradientEnd] = useState("#4f46ff")
  const [gradientAngle, setGradientAngle] = useState(135)
  const [recentColors, setRecentColors] = useState<string[]>([])
  const [recentGradients, setRecentGradients] = useState<SavedGradient[]>([])
  const [eyedropperSupported] = useState(() => typeof window !== "undefined" && !!window.EyeDropper)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const backgroundInputRef = useRef<HTMLInputElement>(null)
  const [canvasDisplaySize, setCanvasDisplaySize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedColor(customColor), 120)
    return () => clearTimeout(timer)
  }, [customColor])

  useEffect(() => {
    setRecentColors(readRecentColors())
    setRecentGradients(readRecentGradients())
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedGradientStart(gradientStartColor)
      setDebouncedGradientEnd(gradientEndColor)
    }, 120)
    return () => clearTimeout(timer)
  }, [gradientStartColor, gradientEndColor])

  useEffect(() => {
    return () => {
      if (backgroundUpload) URL.revokeObjectURL(backgroundUpload.url)
    }
  }, [backgroundUpload])

  const targetW = isCustom ? (parseInt(customW) || 1) : parseInt(selectedRatio.split(":")[0])
  const targetH = isCustom ? (parseInt(customH) || 1) : parseInt(selectedRatio.split(":")[1])
  const shouldUseCustomTargetRatio = variant === "fill" || useCustomPaddingRatio

  const drawCanvas = useCallback((canvas: HTMLCanvasElement): BorderLayout | null => {
    if (!image) return null

    const layout = variant === "fill"
      ? getFillBorderLayout(image.width, image.height, targetW, targetH)
      : useCustomPaddingRatio
        ? getPresentationBorderDimensions(image.width, image.height, targetW, targetH, paddingPercent)
        : getUniformPaddingDimensions(image.width, image.height, paddingPercent)
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    canvas.width = layout.canvasWidth
    canvas.height = layout.canvasHeight
    ctx.clearRect(0, 0, layout.canvasWidth, layout.canvasHeight)

    if (borderStyle === "black") {
      ctx.fillStyle = "#000000"
      ctx.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight)
    } else if (borderStyle === "white") {
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight)
    } else if (borderStyle === "color") {
      ctx.fillStyle = debouncedColor
      ctx.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight)
    } else if (borderStyle === "average") {
      const avg = getAverageEdgeColor(image)
      ctx.fillStyle = `rgb(${avg.r}, ${avg.g}, ${avg.b})`
      ctx.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight)
    } else if (borderStyle === "blur") {
      ctx.save()
      ctx.filter = "blur(48px)"
      ctx.drawImage(image, -32, -32, layout.canvasWidth + 64, layout.canvasHeight + 64)
      ctx.restore()
      ctx.fillStyle = "rgba(0, 0, 0, 0.16)"
      ctx.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight)
    } else if (borderStyle === "gradient") {
      ctx.fillStyle = createAngleGradient(
        ctx,
        layout.canvasWidth,
        layout.canvasHeight,
        gradientAngle,
        debouncedGradientStart,
        debouncedGradientEnd
      )
      ctx.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight)
    } else if (variant === "padding" && borderStyle === "image" && backgroundUpload) {
      drawImageCover(ctx, backgroundUpload.image, layout.canvasWidth, layout.canvasHeight)
    } else if (variant === "padding" && borderStyle === "preset") {
      drawPresetBackground(ctx, selectedPreset, layout.canvasWidth, layout.canvasHeight)
    } else {
      ctx.fillStyle = "#000000"
      ctx.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight)
    }

    if (variant === "padding" && cornerPercent > 0) {
      const cornerRadius = Math.round(Math.min(image.width, image.height) * (cornerPercent / 100))
      ctx.save()
      roundedRect(ctx, layout.imgX, layout.imgY, image.width, image.height, cornerRadius)
      ctx.clip()
      ctx.drawImage(image, layout.imgX, layout.imgY, image.width, image.height)
      ctx.restore()
    } else {
      ctx.drawImage(image, layout.imgX, layout.imgY, image.width, image.height)
    }

    return layout
  }, [
    image,
    variant,
    useCustomPaddingRatio,
    targetW,
    targetH,
    paddingPercent,
    cornerPercent,
    borderStyle,
    debouncedColor,
    debouncedGradientStart,
    debouncedGradientEnd,
    gradientAngle,
    selectedPreset,
    backgroundUpload,
  ])

  useEffect(() => {
    if (!image || !containerRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return

    const layout = drawCanvas(canvas)
    if (!layout) return

    const maxWidth = containerRef.current.clientWidth
    const maxHeight = Math.min(window.innerHeight * 0.5, 520)
    const outputRatio = layout.canvasWidth / layout.canvasHeight

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
  }, [image, drawCanvas])

  useEffect(() => {
    if (!image) return
    const handleResize = () => {
      const canvas = canvasRef.current
      if (canvas) drawCanvas(canvas)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [image, drawCanvas])

  const generateOutputCanvas = useCallback((): HTMLCanvasElement | null => {
    if (!image) return null
    const canvas = document.createElement("canvas")
    drawCanvas(canvas)
    return canvas
  }, [image, drawCanvas])

  const saveRecentColor = useCallback((color: string) => {
    const normalized = normalizeHexColor(color)
    if (!normalized || typeof window === "undefined") return
    setRecentColors((prev) => {
      const next = [normalized, ...prev.filter((item) => item !== normalized)].slice(0, RECENT_LIMIT)
      window.localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const saveRecentGradient = useCallback((gradient: SavedGradient) => {
    const start = normalizeHexColor(gradient.start)
    const end = normalizeHexColor(gradient.end)
    if (!start || !end || typeof window === "undefined") return
    const nextGradient = { start, end, angle: normalizeAngle(gradient.angle) }
    setRecentGradients((prev) => {
      const next = [
        nextGradient,
        ...prev.filter((item) =>
          item.start !== nextGradient.start ||
          item.end !== nextGradient.end ||
          item.angle !== nextGradient.angle
        ),
      ].slice(0, RECENT_LIMIT)
      window.localStorage.setItem(RECENT_GRADIENTS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const saveCurrentStyleToRecents = useCallback(() => {
    if (borderStyle === "color") {
      saveRecentColor(customColor)
    } else if (borderStyle === "gradient") {
      saveRecentGradient({
        start: gradientStartColor,
        end: gradientEndColor,
        angle: gradientAngle,
      })
    }
  }, [borderStyle, customColor, gradientStartColor, gradientEndColor, gradientAngle, saveRecentColor, saveRecentGradient])

  const handleDownload = useCallback(() => {
    const canvas = generateOutputCanvas()
    if (!canvas) return
    saveCurrentStyleToRecents()

    const link = document.createElement("a")
    link.download = `bordered-${targetW}x${targetH}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }, [generateOutputCanvas, saveCurrentStyleToRecents, targetW, targetH])

  const handleCopyToClipboard = useCallback(async () => {
    const canvas = generateOutputCanvas()
    if (!canvas) return

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      )
      if (blob) {
        saveCurrentStyleToRecents()
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ])
        setCopiedMessage(true)
        setTimeout(() => setCopiedMessage(false), 2500)
      }
    } catch {
      handleDownload()
    }
  }, [generateOutputCanvas, handleDownload, saveCurrentStyleToRecents])

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

  const applyRecentColor = useCallback((color: string) => {
    const normalized = normalizeHexColor(color)
    if (!normalized) return
    setCustomColor(normalized)
    setCustomColorInput(normalized.slice(1))
    setBorderStyle("color")
    saveRecentColor(normalized)
  }, [saveRecentColor])

  const applyRecentGradient = useCallback((gradient: SavedGradient) => {
    setGradientStartColor(gradient.start)
    setGradientEndColor(gradient.end)
    setGradientStartInput(gradient.start.slice(1))
    setGradientEndInput(gradient.end.slice(1))
    setGradientAngle(gradient.angle)
    setBorderStyle("gradient")
    saveRecentGradient(gradient)
  }, [saveRecentGradient])

  const handleBackgroundUpload = useCallback((file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return

    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setBackgroundUpload((prev) => {
        if (prev) URL.revokeObjectURL(prev.url)
        return { image: img, url, name: file.name }
      })
      setBorderStyle("image")
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }, [])

  const clearBackgroundUpload = useCallback(() => {
    setBackgroundUpload((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return null
    })
    if (borderStyle === "image") setBorderStyle("preset")
    if (backgroundInputRef.current) backgroundInputRef.current.value = ""
  }, [borderStyle])

  if (!image) return null

  const exact = getExactRatio(image.width, image.height)
  const currentDecimal = image.width / image.height
  const targetDecimal = targetW / targetH
  const isExactMatch = Math.abs(currentDecimal - targetDecimal) < 0.001
  const border = variant === "fill"
    ? getFillBorderLayout(image.width, image.height, targetW, targetH)
    : useCustomPaddingRatio
      ? getPresentationBorderDimensions(image.width, image.height, targetW, targetH, paddingPercent)
      : getUniformPaddingDimensions(image.width, image.height, paddingPercent)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5">
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

        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm text-muted-foreground">Target Ratio</Label>
              <Select
                value={variant === "padding" && !useCustomPaddingRatio ? "auto" : isCustom ? "custom" : selectedRatio}
                onValueChange={(val) => {
                  if (val === "auto") {
                    setUseCustomPaddingRatio(false)
                    return
                  }
                  setUseCustomPaddingRatio(true)
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
                  {variant === "padding" && (
                    <SelectItem value="auto">Auto</SelectItem>
                  )}
                  {BORDER_RATIOS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {shouldUseCustomTargetRatio && isCustom && (
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

            {shouldUseCustomTargetRatio && isExactMatch && (
              <div className="flex items-center gap-1.5 text-sm text-primary">
                <AlertCircle className="size-3.5" />
                <span>
                  {variant === "fill"
                    ? "Already this ratio -- no ratio fill needed"
                    : "Already this ratio -- decorative padding can still add space"}
                </span>
              </div>
            )}

            {variant === "padding" && !useCustomPaddingRatio && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <AlertCircle className="size-3.5" />
                <span>Auto keeps equal padding on every side</span>
              </div>
            )}
          </div>
        </div>

        {variant === "fill" ? (
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <Label className="text-sm text-muted-foreground">Fill Style</Label>
            <RadioGroup
              value={borderStyle === "preset" || borderStyle === "image" ? "black" : borderStyle}
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
                  <RadioGroupItem value={opt.value} id={`fill-${opt.value}`} />
                  <Label htmlFor={`fill-${opt.value}`} className="cursor-pointer text-sm text-foreground">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
              <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="border-padding" className="text-sm text-muted-foreground">
                        Padding
                      </Label>
                      <span className="font-mono text-xs text-muted-foreground">{paddingPercent}%</span>
                    </div>
                    <Slider
                      id="border-padding"
                      min={0}
                      max={30}
                      step={1}
                      value={[paddingPercent]}
                      onValueChange={([value]) => setPaddingPercent(value)}
                      aria-label="Visual padding percentage"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="border-corners" className="text-sm text-muted-foreground">
                        Corners
                      </Label>
                      <span className="font-mono text-xs text-muted-foreground">{cornerPercent}%</span>
                    </div>
                    <Slider
                      id="border-corners"
                      min={0}
                      max={12}
                      step={1}
                      value={[cornerPercent]}
                      onValueChange={([value]) => setCornerPercent(value)}
                      aria-label="Inner image corner radius percentage"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
                <Label className="text-sm text-muted-foreground">Background</Label>
                <RadioGroup
                  value={borderStyle}
                  onValueChange={(val) => setBorderStyle(val as BorderStyle)}
                  className="grid grid-cols-2 gap-2"
                >
                  {([
                    { value: "preset", label: "Preset" },
                    { value: "image", label: "Upload" },
                    { value: "gradient", label: "Gradient" },
                    { value: "blur", label: "Blur" },
                    { value: "average", label: "Avg color" },
                    { value: "color", label: "Custom" },
                    { value: "black", label: "Black" },
                    { value: "white", label: "White" },
                  ] as const).map((opt) => (
                    <div key={opt.value} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                      <RadioGroupItem value={opt.value} id={`border-${opt.value}`} />
                      <Label htmlFor={`border-${opt.value}`} className="cursor-pointer text-sm text-foreground">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {borderStyle === "preset" && (
                  <div className="grid grid-cols-5 gap-2">
                    {BACKGROUND_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedPreset(preset.id)}
                        className={`h-12 rounded-md border p-1 transition ${
                          selectedPreset === preset.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-muted-foreground/50"
                        }`}
                        aria-label={`Use ${preset.label} background`}
                        title={preset.label}
                      >
                        <span
                          className="block size-full rounded-sm"
                          style={{ background: preset.swatch }}
                          aria-hidden="true"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {borderStyle === "image" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={backgroundInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => handleBackgroundUpload(e.target.files?.[0] ?? null)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => backgroundInputRef.current?.click()}
                      className="gap-1.5"
                    >
                      <Upload className="size-3.5" />
                      Upload background
                    </Button>
                    {backgroundUpload ? (
                      <>
                        <span className="max-w-[180px] truncate text-xs text-muted-foreground">
                          {backgroundUpload.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearBackgroundUpload}
                          className="gap-1.5 text-muted-foreground"
                        >
                          <X className="size-3.5" />
                          Clear
                        </Button>
                      </>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ImageIcon className="size-3.5" />
                        Cover-fill behind the image
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
        )}

        {borderStyle === "color" && (
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center gap-2">
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

              <Input
                type="text"
                value={customColorInput}
                onChange={(e) => {
                  const normalized = normalizeHexInput(e.target.value)
                  setCustomColorInput(normalized)
                  if (isFullHex(normalized)) {
                    setCustomColor(`#${normalized.toLowerCase()}`)
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault()
                  const normalized = expandShortHex(normalizeHexInput(e.clipboardData.getData("text")))
                  setCustomColorInput(normalized)
                  if (isFullHex(normalized)) {
                    setCustomColor(`#${normalized.toLowerCase()}`)
                  }
                }}
                onBlur={() => setCustomColorInput(customColor.slice(1))}
                className="w-28 font-mono text-sm uppercase"
                placeholder="FFFFFF"
                aria-label="Border color hex value"
              />

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

            {recentColors.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Recent</span>
                {recentColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => applyRecentColor(color)}
                    className="size-7 rounded-md border border-border transition hover:scale-105 hover:border-muted-foreground/60"
                    style={{ backgroundColor: color }}
                    title={color}
                    aria-label={`Use recent color ${color}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {borderStyle === "gradient" && (
          <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
            <div className="grid gap-4 sm:grid-cols-[auto_auto_minmax(180px,1fr)] sm:items-end">
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm text-muted-foreground">Start</Label>
                <div className="flex items-center gap-2">
                  <div className="relative size-8 shrink-0 overflow-hidden rounded-md border border-border">
                    <input
                      type="color"
                      value={gradientStartColor}
                      onChange={(e) => {
                        setGradientStartColor(e.target.value)
                        setGradientStartInput(e.target.value.slice(1))
                      }}
                      className="absolute inset-0 size-full cursor-pointer opacity-0"
                      aria-label="Pick gradient start color"
                    />
                    <div
                      className="size-full rounded-md"
                      style={{ backgroundColor: gradientStartColor }}
                      aria-hidden="true"
                    />
                  </div>
                  <Input
                    type="text"
                    value={gradientStartInput}
                    onChange={(e) => {
                      const normalized = normalizeHexInput(e.target.value)
                      setGradientStartInput(normalized)
                      if (isFullHex(normalized)) {
                        setGradientStartColor(`#${normalized.toLowerCase()}`)
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault()
                      const normalized = expandShortHex(normalizeHexInput(e.clipboardData.getData("text")))
                      setGradientStartInput(normalized)
                      if (isFullHex(normalized)) {
                        setGradientStartColor(`#${normalized.toLowerCase()}`)
                      }
                    }}
                    onBlur={() => setGradientStartInput(gradientStartColor.slice(1))}
                    className="w-28 font-mono text-sm uppercase"
                    placeholder="FF4FD8"
                    aria-label="Gradient start color hex value"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-sm text-muted-foreground">End</Label>
                <div className="flex items-center gap-2">
                  <div className="relative size-8 shrink-0 overflow-hidden rounded-md border border-border">
                    <input
                      type="color"
                      value={gradientEndColor}
                      onChange={(e) => {
                        setGradientEndColor(e.target.value)
                        setGradientEndInput(e.target.value.slice(1))
                      }}
                      className="absolute inset-0 size-full cursor-pointer opacity-0"
                      aria-label="Pick gradient end color"
                    />
                    <div
                      className="size-full rounded-md"
                      style={{ backgroundColor: gradientEndColor }}
                      aria-hidden="true"
                    />
                  </div>
                  <Input
                    type="text"
                    value={gradientEndInput}
                    onChange={(e) => {
                      const normalized = normalizeHexInput(e.target.value)
                      setGradientEndInput(normalized)
                      if (isFullHex(normalized)) {
                        setGradientEndColor(`#${normalized.toLowerCase()}`)
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault()
                      const normalized = expandShortHex(normalizeHexInput(e.clipboardData.getData("text")))
                      setGradientEndInput(normalized)
                      if (isFullHex(normalized)) {
                        setGradientEndColor(`#${normalized.toLowerCase()}`)
                      }
                    }}
                    onBlur={() => setGradientEndInput(gradientEndColor.slice(1))}
                    className="w-28 font-mono text-sm uppercase"
                    placeholder="4F46FF"
                    aria-label="Gradient end color hex value"
                  />
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="gradient-angle" className="text-sm text-muted-foreground">
                    Angle
                  </Label>
                  <span className="font-mono text-xs text-muted-foreground">{gradientAngle}deg</span>
                </div>
                <Slider
                  id="gradient-angle"
                  min={0}
                  max={359}
                  step={1}
                  value={[gradientAngle]}
                  onValueChange={([value]) => setGradientAngle(value)}
                  aria-label="Gradient direction angle"
                />
              </div>
            </div>

            {recentGradients.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Recent</span>
                {recentGradients.map((gradient) => (
                  <button
                    key={`${gradient.start}-${gradient.end}-${gradient.angle}`}
                    type="button"
                    onClick={() => applyRecentGradient(gradient)}
                    className="h-7 w-12 rounded-md border border-border transition hover:scale-105 hover:border-muted-foreground/60"
                    style={{
                      background: `linear-gradient(${gradient.angle}deg, ${gradient.start}, ${gradient.end})`,
                    }}
                    title={`${gradient.start} -> ${gradient.end} at ${gradient.angle}deg`}
                    aria-label={`Use recent gradient ${gradient.start} to ${gradient.end} at ${gradient.angle} degrees`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-mono">
          <Frame className="size-3.5" />
          Output: {border.canvasWidth} x {border.canvasHeight}px
          <span className="text-border">|</span>
          <span>Padding: {border.padding}px</span>
          {(border.ratioBorderTop > 0 || border.ratioBorderLeft > 0) && (
            <>
              <span className="text-border">|</span>
              {border.ratioBorderTop > 0 && <span>Ratio top/bottom: {border.ratioBorderTop}px</span>}
              {border.ratioBorderLeft > 0 && <span>Ratio left/right: {border.ratioBorderLeft}px</span>}
            </>
          )}
        </div>
      </div>

      <div ref={containerRef} className="relative flex items-center justify-center w-full">
        <canvas
          ref={canvasRef}
          className="rounded-lg shadow-sm"
          style={{
            width: canvasDisplaySize.width || "auto",
            height: canvasDisplaySize.height || "auto",
          }}
          aria-label={`Border preview: ${border.canvasWidth}x${border.canvasHeight} pixels`}
        />
      </div>

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
