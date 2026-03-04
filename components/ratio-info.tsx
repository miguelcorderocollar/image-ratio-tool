"use client"

import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"

interface RatioInfoProps {
  display: string
  decimal: number
  width: number
  height: number
  tolerance: number
  onToleranceChange: (val: number) => void
  matchCount: number
}

export function RatioInfo({
  display,
  decimal,
  width,
  height,
  tolerance,
  onToleranceChange,
  matchCount,
}: RatioInfoProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Exact ratio display */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Exact Ratio</span>
          <span className="font-mono text-xl font-bold text-foreground">
            {display}
          </span>
          <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
            {decimal.toFixed(4)}
          </Badge>
        </div>
        <span className="text-border">|</span>
        <span className="text-sm text-muted-foreground font-mono">
          {width} x {height}px
        </span>
      </div>

      {/* Tolerance slider */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="tolerance-slider" className="text-sm text-muted-foreground">
            Tolerance
          </label>
          <span className="font-mono text-sm text-foreground font-medium">
            {(tolerance * 100).toFixed(0)}%
          </span>
        </div>
        <Slider
          id="tolerance-slider"
          min={1}
          max={50}
          step={1}
          value={[tolerance * 100]}
          onValueChange={(val) => onToleranceChange(val[0] / 100)}
          className="max-w-[200px]"
          aria-label="Tolerance threshold percentage"
        />
        <span className="text-xs text-muted-foreground">
          {matchCount} {matchCount === 1 ? "match" : "matches"}
        </span>
      </div>
    </div>
  )
}
