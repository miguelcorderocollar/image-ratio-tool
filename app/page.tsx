"use client"

import { useState, useCallback, useEffect } from "react"
import { CropMode } from "@/components/crop-mode"
import { BorderMode } from "@/components/border-mode"
import { DropZone } from "@/components/drop-zone"
import { JsonLd } from "@/components/json-ld"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Crop, Frame, Github, Globe, RotateCcw } from "lucide-react"

export default function Page() {
  const [image, setImage] = useState<HTMLImageElement | null>(null)

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
        <Tabs defaultValue="crop" className="flex flex-col gap-6">
          {/* Tab bar + optional reset */}
          <div className="flex items-center justify-between">
            <TabsList className="w-fit">
              <TabsTrigger value="crop" className="gap-1.5 px-4">
                <Crop className="size-4" />
                Crop Mode
              </TabsTrigger>
              <TabsTrigger value="border" className="gap-1.5 px-4">
                <Frame className="size-4" />
                Border Mode
              </TabsTrigger>
            </TabsList>

            {image && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-muted-foreground">
                <RotateCcw className="size-4" />
                New Image
              </Button>
            )}
          </div>

          {/* DropZone shown below the tabs when no image is loaded */}
          {!image && <DropZone onImageLoad={handleImageLoad} />}

          {/* Content panels rendered only when image exists */}
          {image && (
            <>
              <TabsContent value="crop">
                <CropMode image={image} />
              </TabsContent>

              <TabsContent value="border">
                <BorderMode image={image} />
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
                href="https://github.com/miguelcorderocollar"
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
