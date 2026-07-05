"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { RatioMatch, StandardRatio } from "@/lib/ratio-utils"
import { Check } from "lucide-react"

interface RatioCardProps {
  match: RatioMatch
  isExactMatch: boolean
  isSelected: boolean
  onHover: (ratio: { w: number; h: number } | null) => void
  onSelect: (ratio: StandardRatio) => void
}

export function RatioCard({
  match,
  isExactMatch,
  isSelected,
  onHover,
  onSelect,
}: RatioCardProps) {
  const { ratio, percentDiff } = match

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer flex-col gap-1.5 rounded-lg border px-3 py-2.5 transition-all",
        isSelected
          ? "border-primary bg-primary/10 ring-2 ring-primary/20"
          : isExactMatch
            ? "border-primary/50 bg-primary/5"
            : "border-border hover:border-muted-foreground/40 hover:bg-secondary/50"
      )}
      onMouseEnter={() => onHover({ w: ratio.w, h: ratio.h })}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover({ w: ratio.w, h: ratio.h })}
      onBlur={() => onHover(null)}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      aria-label={`${ratio.name} ratio - ${ratio.category}. ${isExactMatch ? "Exact match." : `${(percentDiff * 100).toFixed(1)}% difference.`} Click to select crop size.`}
      onClick={() => onSelect(ratio)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect(ratio)
        }
      }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-base font-semibold text-foreground">
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
    </div>
  )
}
