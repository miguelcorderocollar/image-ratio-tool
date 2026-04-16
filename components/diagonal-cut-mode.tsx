"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Copy, Download, CheckCircle2, RotateCcw, Clock } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Side = "left" | "right" | "top" | "bottom"

interface SideConfig {
  enabled: boolean
  angle: number // degrees, 1–89
}

type SidesConfig = Record<Side, SideConfig>

interface RecentPreset {
  sides: SidesConfig
  label: string
}

const SIDES: Side[] = ["left", "right", "top", "bottom"]
const SIDE_LABELS: Record<Side, string> = {
  left: "Left",
  right: "Right",
  top: "Top",
  bottom: "Bottom",
}

const DEFAULT_ANGLE = 15
const LS_KEY = "diagonal-cut-recent"
const MAX_RECENT = 5

function defaultSides(): SidesConfig {
  return {
    left: { enabled: true, angle: DEFAULT_ANGLE },
    right: { enabled: false, angle: DEFAULT_ANGLE },
    top: { enabled: false, angle: DEFAULT_ANGLE },
    bottom: { enabled: false, angle: DEFAULT_ANGLE },
  }
}

function presetLabel(sides: SidesConfig): string {
  const active = SIDES.filter((s) => sides[s].enabled)
  if (active.length === 0) return "No cuts"
  return active.map((s) => `${SIDE_LABELS[s]} ${sides[s].angle}°`).join(", ")
}

function loadRecent(): RecentPreset[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as RecentPreset[]
  } catch {
    return []
  }
}

function saveRecent(sides: SidesConfig) {
  const label = presetLabel(sides)
  const next: RecentPreset = { sides, label }
  const existing = loadRecent().filter((r) => r.label !== label)
  const updated = [next, ...existing].slice(0, MAX_RECENT)
  localStorage.setItem(LS_KEY, JSON.stringify(updated))
}

// ─── Canvas rendering ─────────────────────────────────────────────────────────

/**
 * Builds a clipping path on `ctx` that keeps the "visible" polygon
 * after applying diagonal cuts on the requested sides.
 *
 * For each enabled side we cut a triangle off the corner using the angle
 * measured from that edge inward.
 *
 * The clip region is defined as a convex polygon built by traversing
 * the four edges and inserting the diagonal cut points.
 */
function buildClipPath(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  sides: SidesConfig
) {
  // Helper: how far along the perpendicular axis does the cut go?
  // angle is in degrees from the edge face.
  const depth = (edge: "horiz" | "vert", angle: number) => {
    const rad = (angle * Math.PI) / 180
    return edge === "horiz"
      ? Math.round(h * Math.tan(rad) * 0.5)  // left/right: depth into width
      : Math.round(w * Math.tan(rad) * 0.5)  // top/bottom: depth into height
  }

  const L = sides.left
  const R = sides.right
  const T = sides.top
  const B = sides.bottom

  // Inward depths
  const dL = L.enabled ? depth("horiz", L.angle) : 0
  const dR = R.enabled ? depth("horiz", R.angle) : 0
  const dT = T.enabled ? depth("vert", T.angle) : 0
  const dB = B.enabled ? depth("vert", B.angle) : 0

  // We build the polygon going clockwise: top-left → top-right → bottom-right → bottom-left
  ctx.beginPath()

  // Top-left corner
  if (L.enabled && T.enabled) {
    ctx.moveTo(dL, 0)
    ctx.lineTo(w, 0)
  } else if (L.enabled) {
    ctx.moveTo(dL, 0)
    ctx.lineTo(w, 0)
  } else if (T.enabled) {
    ctx.moveTo(0, dT)
    ctx.lineTo(w, 0)
  } else {
    ctx.moveTo(0, 0)
    ctx.lineTo(w, 0)
  }

  // Top-right corner
  if (R.enabled && T.enabled) {
    ctx.lineTo(w - dR, 0)
    ctx.lineTo(w, dT)
  } else if (R.enabled) {
    ctx.lineTo(w - dR, 0)
    ctx.lineTo(w, dR)
  } else if (T.enabled) {
    ctx.lineTo(w - dT, 0)
    ctx.lineTo(w, dT)
  } else {
    // already at (w,0), just go down
    ctx.lineTo(w, h)
  }

  // Bottom-right corner
  if (R.enabled && B.enabled) {
    ctx.lineTo(w, h - dB)
    ctx.lineTo(w - dR, h)
  } else if (R.enabled) {
    ctx.lineTo(w, h - dR)
    ctx.lineTo(w - dR, h)
  } else if (B.enabled) {
    ctx.lineTo(w, h - dB)
    ctx.lineTo(w - dB, h)
  } else {
    ctx.lineTo(w - 0, h)
  }

  // Bottom-left corner
  if (L.enabled && B.enabled) {
    ctx.lineTo(dL, h)
    ctx.lineTo(0, h - dB)
  } else if (L.enabled) {
    ctx.lineTo(dL, h)
    ctx.lineTo(0, h - dL)
  } else if (B.enabled) {
    ctx.lineTo(dB, h)
    ctx.lineTo(0, h - dB)
  } else {
    ctx.lineTo(0, h)
  }

  // Back to start
  if (L.enabled) {
    ctx.lineTo(0, dL)
    ctx.lineTo(dL, 0)
  } else if (T.enabled) {
    ctx.lineTo(0, dT)
    ctx.lineTo(dT > 0 ? 0 : 0, 0)
  } else {
    ctx.lineTo(0, 0)
  }

  ctx.closePath()
}

function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  size = 12
) {
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      const even = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0
      ctx.fillStyle = even ? "#334155" : "#1e293b"
      ctx.fillRect(x, y, size, size)
    }
  }
}

function renderCut(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  sides: SidesConfig,
  transparent = false
) {
  const w = image.width
  const h = image.height
  canvas.width = w
  canvas.height = h

  const ctx = canvas.getContext("2d")
  if (!ctx) return

  ctx.clearRect(0, 0, w, h)

  if (!transparent) {
    drawCheckerboard(ctx, w, h)
  }

  ctx.save()
  buildClipPath(ctx, w, h, sides)
  ctx.clip()
  ctx.drawImage(image, 0, 0, w, h)
  ctx.restore()
}

// ─── Component ────────────────────────────────────────────────────────────────

interface DiagonalCutModeProps {
  image: HTMLImageElement | null
}

export function DiagonalCutMode({ image }: DiagonalCutModeProps) {
  const [sides, setSides] = useState<SidesConfig>(defaultSides)
  const [debouncedSides, setDebouncedSides] = useState<SidesConfig>(defaultSides)
  const [recentPresets, setRecentPresets] = useState<RecentPreset[]>([])
  const [copiedMessage, setCopiedMessage] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasDisplaySize, setCanvasDisplaySize] = useState({ width: 0, height: 0 })

  // Load recent from localStorage on mount
  useEffect(() => {
    setRecentPresets(loadRecent())
  }, [])

  // Debounce sides → debouncedSides (80ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSides(sides), 80)
    return () => clearTimeout(t)
  }, [sides])

  // Render preview whenever debounced config or image changes
  useEffect(() => {
    if (!image || !canvasRef.current || !containerRef.current) return

    renderCut(canvasRef.current, image, debouncedSides, false)

    // Compute display size
    const maxW = containerRef.current.clientWidth
    const maxH = Math.min(window.innerHeight * 0.55, 520)
    const ratio = image.width / image.height
    let dw: number, dh: number
    if (ratio > maxW / maxH) {
      dw = maxW; dh = maxW / ratio
    } else {
      dh = maxH; dw = maxH * ratio
    }
    setCanvasDisplaySize({ width: Math.round(dw), height: Math.round(dh) })
  }, [image, debouncedSides])

  // ── Helpers ────────────────────────────────────────────────────────────────

  const updateSide = useCallback((side: Side, patch: Partial<SideConfig>) => {
    setSides((prev) => ({
      ...prev,
      [side]: { ...prev[side], ...patch },
    }))
  }, [])

  const activeSides = SIDES.filter((s) => sides[s].enabled)

  const handleReset = useCallback(() => {
    setSides(defaultSides())
  }, [])

  const applyPreset = useCallback((preset: RecentPreset) => {
    setSides(preset.sides)
  }, [])

  const generateOutputCanvas = useCallback((): HTMLCanvasElement | null => {
    if (!image) return null
    const offscreen = document.createElement("canvas")
    renderCut(offscreen, image, debouncedSides, true)
    return offscreen
  }, [image, debouncedSides])

  const handleDownload = useCallback(() => {
    const canvas = generateOutputCanvas()
    if (!canvas) return
    saveRecent(debouncedSides)
    setRecentPresets(loadRecent())

    const link = document.createElement("a")
    link.download = "diagonal-cut.png"
    link.href = canvas.toDataURL("image/png")
    link.click()
  }, [generateOutputCanvas, debouncedSides])

  const handleCopy = useCallback(async () => {
    const canvas = generateOutputCanvas()
    if (!canvas) return
    saveRecent(debouncedSides)
    setRecentPresets(loadRecent())

    try {
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"))
      if (blob) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
        setCopiedMessage(true)
        setTimeout(() => setCopiedMessage(false), 2500)
      }
    } catch {
      handleDownload()
    }
  }, [generateOutputCanvas, debouncedSides, handleDownload])

  if (!image) return null

  return (
    <div className="flex flex-col gap-6">

      {/* ── Side toggles ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm text-muted-foreground">Cut Sides</Label>
        <ToggleGroup
          type="multiple"
          variant="outline"
          value={activeSides}
          onValueChange={(vals) => {
            const next = vals as Side[]
            setSides((prev) => {
              const updated = { ...prev }
              SIDES.forEach((s) => {
                updated[s] = { ...prev[s], enabled: next.includes(s) }
              })
              return updated
            })
          }}
        >
          {SIDES.map((side) => (
            <ToggleGroupItem key={side} value={side} className="px-5">
              {SIDE_LABELS[side]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {activeSides.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Select at least one side to apply a cut.
          </p>
        )}
      </div>

      {/* ── Per-side angle controls ──────────────────────────────────────────── */}
      {activeSides.length > 0 && (
        <div className="flex flex-col gap-4">
          <Label className="text-sm text-muted-foreground">Angles</Label>
          {activeSides.map((side) => {
            const cfg = sides[side]
            return (
              <div key={side} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {SIDE_LABELS[side]}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={1}
                      max={89}
                      value={cfg.angle}
                      onChange={(e) => {
                        const v = Math.max(1, Math.min(89, Number(e.target.value)))
                        updateSide(side, { angle: v })
                      }}
                      className="w-16 text-center font-mono text-sm"
                      aria-label={`${SIDE_LABELS[side]} cut angle in degrees`}
                    />
                    <span className="text-xs text-muted-foreground">°</span>
                  </div>
                </div>
                <Slider
                  min={1}
                  max={89}
                  step={1}
                  value={[cfg.angle]}
                  onValueChange={([v]) => updateSide(side, { angle: v })}
                  aria-label={`${SIDE_LABELS[side]} angle slider`}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>1° shallow</span>
                  <span>89° steep</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Recent presets ───────────────────────────────────────────────────── */}
      {recentPresets.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="size-3.5" />
            Recent presets
          </div>
          <div className="flex flex-wrap gap-2">
            {recentPresets.map((preset, i) => (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => applyPreset(preset)}
                    className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground font-mono"
                  >
                    {preset.label}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Click to apply this preset</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {/* ── Reset ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end">
        <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-muted-foreground">
          <RotateCcw className="size-3.5" />
          Reset cuts
        </Button>
      </div>

      {/* ── Canvas preview ──────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-border"
        style={{ minHeight: 200 }}
      >
        <canvas
          ref={canvasRef}
          className="block"
          style={{
            width: canvasDisplaySize.width || "auto",
            height: canvasDisplaySize.height || "auto",
          }}
          aria-label="Diagonal cut preview"
        />
      </div>

      {/* ── Output info ─────────────────────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground font-mono">
        Output: {image.width} x {image.height}px &nbsp;·&nbsp; PNG with transparency
      </p>

      {/* ── Action buttons ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button onClick={handleCopy} className="gap-2">
          <Copy className="size-4" />
          Copy PNG
        </Button>
        <Button variant="outline" onClick={handleDownload} className="gap-2">
          <Download className="size-4" />
          Download PNG
        </Button>
      </div>

      {/* ── Toast ───────────────────────────────────────────────────────────── */}
      {copiedMessage && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="size-4" />
          Transparent PNG copied to clipboard
        </div>
      )}
    </div>
  )
}
