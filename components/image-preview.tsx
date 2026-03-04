"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { getCropDimensions } from "@/lib/ratio-utils"

interface ImagePreviewProps {
  image: HTMLImageElement
  hoveredRatio: { w: number; h: number } | null
}

export function ImagePreview({ image, hoveredRatio }: ImagePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  const calculateCanvasSize = useCallback(() => {
    const container = containerRef.current
    if (!container || !image) return

    const maxWidth = container.clientWidth
    const maxHeight = Math.min(window.innerHeight * 0.55, 560)
    const imgRatio = image.width / image.height

    let displayWidth: number
    let displayHeight: number

    if (imgRatio > maxWidth / maxHeight) {
      displayWidth = maxWidth
      displayHeight = maxWidth / imgRatio
    } else {
      displayHeight = maxHeight
      displayWidth = maxHeight * imgRatio
    }

    setCanvasSize({
      width: Math.round(displayWidth),
      height: Math.round(displayHeight),
    })
  }, [image])

  useEffect(() => {
    calculateCanvasSize()
    window.addEventListener("resize", calculateCanvasSize)
    return () => window.removeEventListener("resize", calculateCanvasSize)
  }, [calculateCanvasSize])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || canvasSize.width === 0) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = canvasSize.width
    canvas.height = canvasSize.height

    ctx.drawImage(image, 0, 0, canvasSize.width, canvasSize.height)

    if (hoveredRatio) {
      const crop = getCropDimensions(
        canvasSize.width,
        canvasSize.height,
        hoveredRatio.w,
        hoveredRatio.h
      )

      // Draw dark overlay on excluded areas
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)"
      // Top
      ctx.fillRect(0, 0, canvasSize.width, crop.y)
      // Bottom
      ctx.fillRect(
        0,
        crop.y + crop.height,
        canvasSize.width,
        canvasSize.height - crop.y - crop.height
      )
      // Left
      ctx.fillRect(0, crop.y, crop.x, crop.height)
      // Right
      ctx.fillRect(
        crop.x + crop.width,
        crop.y,
        canvasSize.width - crop.x - crop.width,
        crop.height
      )

      // Draw crop border
      ctx.strokeStyle = "oklch(0.72 0.19 165)"
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.strokeRect(crop.x, crop.y, crop.width, crop.height)
      ctx.setLineDash([])

      // Draw corner marks
      const cornerLen = 12
      ctx.strokeStyle = "oklch(0.72 0.19 165)"
      ctx.lineWidth = 3
      const corners = [
        { x: crop.x, y: crop.y },
        { x: crop.x + crop.width, y: crop.y },
        { x: crop.x, y: crop.y + crop.height },
        { x: crop.x + crop.width, y: crop.y + crop.height },
      ]
      corners.forEach(({ x, y }, i) => {
        const dx = i % 2 === 0 ? 1 : -1
        const dy = i < 2 ? 1 : -1
        ctx.beginPath()
        ctx.moveTo(x + dx * cornerLen, y)
        ctx.lineTo(x, y)
        ctx.lineTo(x, y + dy * cornerLen)
        ctx.stroke()
      })
    }
  }, [image, canvasSize, hoveredRatio])

  return (
    <div ref={containerRef} className="relative flex items-center justify-center w-full">
      <canvas
        ref={canvasRef}
        className="rounded-lg"
        style={{
          width: canvasSize.width || "auto",
          height: canvasSize.height || "auto",
        }}
        aria-label={`Image preview: ${image.width}x${image.height} pixels`}
      />
    </div>
  )
}
