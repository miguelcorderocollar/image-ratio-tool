"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"
import { getCropDimensions } from "@/lib/ratio-utils"

type CropRect = { x: number; y: number; width: number; height: number }
type DragMode = "move" | "resize"
type ResizeHandle = "nw" | "ne" | "sw" | "se"

interface ImagePreviewProps {
  image: HTMLImageElement
  hoveredRatio: { w: number; h: number } | null
  cropRect?: CropRect | null
  onCropRectChange?: (crop: CropRect) => void
}

const MIN_CROP_SIZE = 24

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function ImagePreview({
  image,
  hoveredRatio,
  cropRect,
  onCropRectChange,
}: ImagePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const interactionRef = useRef<{
    mode: DragMode
    handle?: ResizeHandle
    pointerX: number
    pointerY: number
    crop: CropRect
    captureTarget: Element
  } | null>(null)

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
  }, [image, canvasSize])

  const scaleX = canvasSize.width / image.width
  const scaleY = canvasSize.height / image.height
  const displayCrop = cropRect
    ? {
        x: cropRect.x * scaleX,
        y: cropRect.y * scaleY,
        width: cropRect.width * scaleX,
        height: cropRect.height * scaleY,
      }
    : hoveredRatio
      ? getCropDimensions(canvasSize.width, canvasSize.height, hoveredRatio.w, hoveredRatio.h)
      : null

  const commitCrop = useCallback((nextCrop: CropRect) => {
    if (!onCropRectChange) return
    onCropRectChange({
      x: Math.round(nextCrop.x),
      y: Math.round(nextCrop.y),
      width: Math.round(nextCrop.width),
      height: Math.round(nextCrop.height),
    })
  }, [onCropRectChange])

  const startInteraction = useCallback((
    e: ReactPointerEvent,
    mode: DragMode,
    handle?: ResizeHandle
  ) => {
    if (!cropRect || !onCropRectChange) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    interactionRef.current = {
      mode,
      handle,
      pointerX: e.clientX,
      pointerY: e.clientY,
      crop: cropRect,
      captureTarget: e.currentTarget,
    }
  }, [cropRect, onCropRectChange])

  const handlePointerMove = useCallback((e: ReactPointerEvent) => {
    const interaction = interactionRef.current
    if (!interaction || !hoveredRatio) return

    const dx = (e.clientX - interaction.pointerX) / scaleX
    const dy = (e.clientY - interaction.pointerY) / scaleY
    const aspect = hoveredRatio.w / hoveredRatio.h
    const start = interaction.crop

    if (interaction.mode === "move") {
      commitCrop({
        ...start,
        x: clamp(start.x + dx, 0, image.width - start.width),
        y: clamp(start.y + dy, 0, image.height - start.height),
      })
      return
    }

    let anchorX = start.x
    let anchorY = start.y
    let proposedWidthFromX = start.width

    if (interaction.handle === "nw" || interaction.handle === "sw") {
      anchorX = start.x + start.width
      proposedWidthFromX = anchorX - (start.x + dx)
    } else {
      proposedWidthFromX = start.width + dx
    }

    let proposedHeightFromY = start.height + dy
    if (interaction.handle === "nw" || interaction.handle === "ne") {
      anchorY = start.y + start.height
      proposedHeightFromY = anchorY - (start.y + dy)
    }

    const proposedWidthFromY = proposedHeightFromY * aspect
    const proposedWidth =
      Math.abs(proposedWidthFromX - start.width) > Math.abs(proposedWidthFromY - start.width)
        ? proposedWidthFromX
        : proposedWidthFromY

    const maxWidthFromAnchor =
      interaction.handle === "nw" || interaction.handle === "sw" ? anchorX : image.width - anchorX
    const maxHeightFromAnchor =
      interaction.handle === "nw" || interaction.handle === "ne" ? anchorY : image.height - anchorY
    const maxWidth = Math.min(maxWidthFromAnchor, maxHeightFromAnchor * aspect)
    const width = clamp(proposedWidth, MIN_CROP_SIZE, maxWidth)
    const height = width / aspect
    const x = interaction.handle === "nw" || interaction.handle === "sw" ? anchorX - width : anchorX
    const y = interaction.handle === "nw" || interaction.handle === "ne" ? anchorY - height : anchorY

    commitCrop({ x, y, width, height })
  }, [commitCrop, hoveredRatio, image, scaleX, scaleY])

  const stopInteraction = useCallback((e: ReactPointerEvent) => {
    const interaction = interactionRef.current
    if (!interaction) return
    interactionRef.current = null
    if (interaction.captureTarget.hasPointerCapture(e.pointerId)) {
      interaction.captureTarget.releasePointerCapture(e.pointerId)
    }
  }, [])

  return (
    <div ref={containerRef} className="relative flex items-center justify-center w-full">
      <div className="relative touch-none">
        <canvas
          ref={canvasRef}
          className="rounded-lg"
          style={{
            width: canvasSize.width || "auto",
            height: canvasSize.height || "auto",
          }}
          aria-label={`Image preview: ${image.width}x${image.height} pixels`}
        />
        {displayCrop && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
            <div className="absolute inset-x-0 top-0 bg-black/60" style={{ height: displayCrop.y }} />
            <div
              className="absolute inset-x-0 bottom-0 bg-black/60"
              style={{ height: canvasSize.height - displayCrop.y - displayCrop.height }}
            />
            <div
              className="absolute left-0 bg-black/60"
              style={{ top: displayCrop.y, width: displayCrop.x, height: displayCrop.height }}
            />
            <div
              className="absolute right-0 bg-black/60"
              style={{
                top: displayCrop.y,
                width: canvasSize.width - displayCrop.x - displayCrop.width,
                height: displayCrop.height,
              }}
            />
          </div>
        )}
        {displayCrop && (
          <div
            className="absolute border-2 border-dashed border-sky-300 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
            style={{
              left: displayCrop.x,
              top: displayCrop.y,
              width: displayCrop.width,
              height: displayCrop.height,
              cursor: cropRect ? "move" : "default",
            }}
            onPointerDown={(e) => startInteraction(e, "move")}
            onPointerMove={handlePointerMove}
            onPointerUp={stopInteraction}
            onPointerCancel={stopInteraction}
          >
            {cropRect && (["nw", "ne", "sw", "se"] as ResizeHandle[]).map((handle) => (
              <button
                key={handle}
                type="button"
                className="absolute size-4 rounded-full border-2 border-background bg-sky-300 shadow"
                style={{
                  left: handle.endsWith("w") ? -8 : undefined,
                  right: handle.endsWith("e") ? -8 : undefined,
                  top: handle.startsWith("n") ? -8 : undefined,
                  bottom: handle.startsWith("s") ? -8 : undefined,
                  cursor: `${handle}-resize`,
                }}
                aria-label={`Resize crop from ${handle} corner`}
                onPointerDown={(e) => startInteraction(e, "resize", handle)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
