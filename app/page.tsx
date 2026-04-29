"use client"

import { useState, useCallback, useEffect } from "react"
import { CropMode } from "@/components/crop-mode"
import { BorderMode } from "@/components/border-mode"
import { DiagonalCutMode } from "@/components/diagonal-cut-mode"
import { ResizeMode } from "@/components/resize-mode"
import { DropZone } from "@/components/drop-zone"
import { JsonLd } from "@/components/json-ld"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Crop, Frame, Scissors, Github, Globe, RotateCcw, Scaling } from "lucide-react"

const toolDescriptions = {
  crop: {
    title: "Crop Mode",
    description: "Analyze the current ratio, preview common formats, adjust the crop box, and export a centered crop.",
    eyebrow: "Ratio analysis and crop",
    icon: Crop,
  },
  border: {
    title: "Border Mode",
    description: "Expand the canvas to a target ratio without cropping, then fill the added space with solid, sampled, blurred, or gradient borders.",
    eyebrow: "Canvas expansion",
    icon: Frame,
  },
  resize: {
    title: "Resize",
    description: "Scale an image with quick presets or exact pixel dimensions, with optional aspect-ratio locking and PNG or JPEG export.",
    eyebrow: "Pixel resizing",
    icon: Scaling,
  },
  diagonal: {
    title: "Diagonal Cut",
    description: "Cut one or more sides at adjustable angles and export the result as a transparent PNG.",
    eyebrow: "Transparent cutout export",
    icon: Scissors,
  },
} as const

export default function Page() {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [activeTab, setActiveTab] = useState<keyof typeof toolDescriptions>("crop")
  const activeTool = toolDescriptions[activeTab]
  const ActiveToolIcon = activeTool.icon

  const handleImageLoad = useCallback((img: HTMLImageElement) => {
    setImage(img)
  }, [])

  const handleReset = useCallback(() => {
    setImage(null)
  }, [])

  // Global paste listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) {
            const reader = new FileReader()
            reader.onload = (ev) => {
              if (ev.target?.result) {
                const img = new Image()
                img.crossOrigin = "anonymous"
                img.onload = () => handleImageLoad(img)
                img.src = ev.target.result as string
              }
            }
            reader.readAsDataURL(file)
            return
          }
        }
      }
    }
    window.addEventListener("paste", handlePaste)
    return () => window.removeEventListener("paste", handlePaste)
  }, [handleImageLoad])

  return (
    <main className="min-h-screen bg-background">
      <JsonLd />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <svg
              width="36"
              height="36"
              viewBox="0 0 30 30"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="logo-bg" x1="0.146" y1="0.854" x2="0.854" y2="0.146">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
              </defs>
              <rect width="30" height="30" rx="6" fill="url(#logo-bg)" />
              <g transform="translate(2.43, 2.43) scale(1.048)" fill="#ffffff">
                <path d="M21 3C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H21ZM20 5H4V19H20V5ZM13 17V15H16V12H18V17H13ZM11 7V9H8V12H6V7H11Z" />
              </g>
            </svg>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl text-balance">
                Image Ratio Tool
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Analyze aspect ratios, crop to standard formats, or add borders
              </p>
            </div>
          </div>
        </header>

        {/* Mode Tabs - always visible at the top */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as keyof typeof toolDescriptions)} className="flex flex-col gap-6">
          {/* Tab bar + optional reset */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="h-auto flex-wrap justify-start">
              <TabsTrigger value="crop" className="gap-1.5 px-4">
                <Crop className="size-4" />
                Crop Mode
              </TabsTrigger>
              <TabsTrigger value="border" className="gap-1.5 px-4">
                <Frame className="size-4" />
                Border Mode
              </TabsTrigger>
              <TabsTrigger value="resize" className="gap-1.5 px-4">
                <Scaling className="size-4" />
                Resize
              </TabsTrigger>
              <TabsTrigger value="diagonal" className="gap-1.5 px-4">
                <Scissors className="size-4" />
                Diagonal Cut
              </TabsTrigger>
            </TabsList>

            {image && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-muted-foreground">
                <RotateCcw className="size-4" />
                New Image
              </Button>
            )}
          </div>

          {/* Empty state */}
          {!image && (
            <>
              <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card/60 px-4 py-3 shadow-sm">
                <div className="absolute inset-y-0 left-0 w-1 bg-primary/80" />
                <div className="flex items-start gap-3 pl-2">
                  <div className="mt-0.5 rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
                    <ActiveToolIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                      {activeTool.eyebrow}
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {activeTool.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {activeTool.description}
                    </p>
                  </div>
                </div>
              </div>
              <DropZone onImageLoad={handleImageLoad} />
            </>
          )}

          {/* Content panels rendered only when image exists */}
          {image && (
            <>
              <TabsContent value="crop">
                <CropMode image={image} />
              </TabsContent>

              <TabsContent value="border">
                <BorderMode image={image} />
              </TabsContent>
              <TabsContent value="resize">
                <ResizeMode image={image} />
              </TabsContent>
              <TabsContent value="diagonal">
                <DiagonalCutMode image={image} />
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* Footer */}
        <footer className="mt-12 border-t border-border pt-6 pb-8">
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <p className="flex items-center gap-1.5">
              Made with <span aria-label="robot">🤖</span> by Miguel Cordero Collar
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://miguelcorderocollar.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <Globe className="size-4" />
                <span>Website</span>
              </a>
              <span className="text-border" aria-hidden="true">{'|'}</span>
              <a
                href="https://github.com/miguelcorderocollar/image-ratio-tool"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <Github className="size-4" />
                <span>GitHub</span>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  )
}
