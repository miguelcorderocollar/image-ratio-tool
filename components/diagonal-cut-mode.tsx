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
  angle: number // degrees 1–89
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
    left:   { enabled: true,  angle: DEFAULT_ANGLE },
    right:  { enabled: false, angle: DEFAULT_ANGLE },
    top:    { enabled: false, angle: DEFAULT_ANGLE },
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
    return raw ? (JSON.parse(raw) as RecentPreset[]) : []
  } catch {
    return []
  }
}

function saveRecent(sides: SidesConfig) {
  const label = presetLabel(sides)
  const existing = loadRecent().filter((r) => r.label !== label)
  const updated = [{ sides, label }, ...existing].slice(0, MAX_RECENT)
  localStorage.setItem(LS_KEY, JSON.stringify(updated))
}

// ─── Geometry ─────────────────────────────────────────────────────────────────
//
// Each side cut is defined as a straight diagonal line that slices across the
// full width (left/right) or full height (top/bottom) of the image.
//
// The angle controls how far inward (in pixels) the cut reaches at its deepest point:
//   LEFT  : line from (dL, 0) [top edge]    to (0,    h) [bottom-left]  → removes top-left wedge
//   RIGHT : line from (w,   0) [top-right]  to (w-dR, h) [bottom edge]  → removes top-right wedge
//   TOP   : line from (0,  dT) [left edge]  to (w,    0) [top-right]    → removes top strip
//   BOTTOM: line from (0,   h) [bottom-left] to (w, h-dB) [right edge]  → removes bottom strip
//
// depth for LEFT/RIGHT = w * tan(angle), capped at 98% of w
// depth for TOP/BOTTOM = h * tan(angle), capped at 98% of h
//
// Polygon clipping uses the Sutherland–Hodgman algorithm so multiple cuts
// combine correctly without gaps or artifacts.

type Point = [number, number]

function clipPolygonByLine(polygon: Point[], p1: Point, p2: Point): Point[] {
  // Clips polygon to the half-plane that is on the LEFT side of the directed
  // line p1 → p2 (i.e. positive cross-product side).
  const result: Point[] = []
  const n = polygon.length
  if (n === 0) return result

  const inside = (p: Point): boolean => {
    const dx = p2[0] - p1[0]
    const dy = p2[1] - p1[1]
    return dx * (p[1] - p1[1]) - dy * (p[0] - p1[0]) >= 0
  }

  const intersect = (a: Point, b: Point): Point => {
    const dx1 = b[0] - a[0], dy1 = b[1] - a[1]
    const dx2 = p2[0] - p1[0], dy2 = p2[1] - p1[1]
    const denom = dx1 * dy2 - dy1 * dx2
    if (Math.abs(denom) < 1e-10) return a
    const t = ((p1[0] - a[0]) * dy2 - (p1[1] - a[1]) * dx2) / denom
    return [a[0] + t * dx1, a[1] + t * dy1]
  }

  for (let i = 0; i < n; i++) {
    const cur = polygon[i]
    const next = polygon[(i + 1) % n]
    const curIn = inside(cur)
    const nextIn = inside(next)
    if (curIn) result.push(cur)
    if (curIn !== nextIn) result.push(intersect(cur, next))
  }

  return result
}

function buildClipPolygon(w: number, h: number, sides: SidesConfig): Point[] {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dL = sides.left.enabled   ? Math.min(w * 0.98, Math.round(w * Math.tan(toRad(sides.left.angle))))   : 0
  const dR = sides.right.enabled  ? Math.min(w * 0.98, Math.round(w * Math.tan(toRad(sides.right.angle))))  : 0
  const dT = sides.top.enabled    ? Math.min(h * 0.98, Math.round(h * Math.tan(toRad(sides.top.angle))))    : 0
  const dB = sides.bottom.enabled ? Math.min(h * 0.98, Math.round(h * Math.tan(toRad(sides.bottom.angle)))) : 0

  // Start with full rectangle (clockwise)
  let poly: Point[] = [[0, 0], [w, 0], [w, h], [0, h]]

  // LEFT: diagonal from (dL,0) to (0,h) — keep the right/main side.
  // Reverse p1↔p2 so "left of line" = interior (main image area).
  if (sides.left.enabled && dL > 0)
    poly = clipPolygonByLine(poly, [0, h], [dL, 0])

  // RIGHT: diagonal from (w,0) to (w-dR,h) — keep the left/main side.
  if (sides.right.enabled && dR > 0)
    poly = clipPolygonByLine(poly, [w - dR, h], [w, 0])

  // TOP: diagonal from (0,dT) to (w,0) — keep the bottom/main side.
  if (sides.top.enabled && dT > 0)
    poly = clipPolygonByLine(poly, [w, 0], [0, dT])

  // BOTTOM: diagonal from (0,h) to (w,h-dB) — keep the top/main side.
  if (sides.bottom.enabled && dB > 0)
    poly = clipPolygonByLine(poly, [w, h - dB], [0, h])

  return poly
}

// ─── Canvas helpers ───────────────────────────────────────────────────────────

function drawCheckerboard(ctx: CanvasRenderingContext2D, w: number, h: number, size = 12) {
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
  if (!transparent) drawCheckerboard(ctx, w, h)

  const polygon = buildClipPolygon(w, h, sides)
  if (polygon.length < 3) return

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(polygon[0][0], polygon[0][1])
  for (let i = 1; i < polygon.length; i++) ctx.lineTo(polygon[i][0], polygon[i][1])
  ctx.closePath()
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
  const [canvasDisplaySize, setCanvasDisplaySize] = useState({ width: 0, height: 0 })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load recent presets from localStorage on mount
  useEffect(() => { setRecentPresets(loadRecent()) }, [])

  // Debounce sides → debouncedSides (80ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSides(sides), 80)
    return () => clearTimeout(t)
  }, [sides])

  // Render preview whenever debounced config or image changes
  useEffect(() => {
    if (!image || !canvasRef.current || !containerRef.current) return
    renderCut(canvasRef.current, image, debouncedSides, false)

    const maxW = containerRef.current.clientWidth
    const maxH = Math.min(window.innerHeight * 0.55, 520)
    const ratio = image.width / image.height
    let dw: number, dh: number
    if (ratio > maxW / maxH) { dw = maxW; dh = maxW / ratio }
    else                     { dh = maxH; dw = maxH * ratio }
    setCanvasDisplaySize({ width: Math.round(dw), height: Math.round(dh) })
  }, [image, debouncedSides])

  const updateSide = useCallback((side: Side, patch: Partial<SideConfig>) => {
    setSides((prev) => ({ ...prev, [side]: { ...prev[side], ...patch } }))
  }, [])

  const handleReset = useCallback(() => setSides(defaultSides()), [])

  const applyPreset = useCallback((preset: RecentPreset) => setSides(preset.sides), [])

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

  const activeSides = SIDES.filter((s) => sides[s].enabled)

  return (
    <div className="flex flex-col gap-6">

      {/* Side toggles */}
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
              SIDES.forEach((s) => { updated[s] = { ...prev[s], enabled: next.includes(s) } })
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
          <p className="text-xs text-muted-foreground">Select at least one side to apply a cut.</p>
        )}
      </div>

      {/* Per-side angle controls */}
      {activeSides.length > 0 && (
        <div className="flex flex-col gap-4">
          <Label className="text-sm text-muted-foreground">Angles</Label>
          {activeSides.map((side) => {
            const cfg = sides[side]
            return (
              <div key={side} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{SIDE_LABELS[side]}</span>
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

      {/* Recent presets */}
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

      {/* Reset */}
      <div className="flex items-center justify-end">
        <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-muted-foreground">
          <RotateCcw className="size-3.5" />
          Reset cuts
        </Button>
      </div>

      {/* Canvas preview */}
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

      {/* Output info */}
      <p className="text-xs text-muted-foreground font-mono">
        Output: {image.width} x {image.height}px &nbsp;&middot;&nbsp; PNG with transparency
      </p>

      {/* Action buttons */}
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

      {/* Toast */}
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
