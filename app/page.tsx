"use client"

import { CropMode } from "@/components/crop-mode"
import { BorderMode } from "@/components/border-mode"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Crop, Frame } from "lucide-react"

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
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

        {/* Mode Tabs */}
        <Tabs defaultValue="crop" className="flex flex-col gap-6">
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

          <TabsContent value="crop">
            <CropMode />
          </TabsContent>

          <TabsContent value="border">
            <BorderMode />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
