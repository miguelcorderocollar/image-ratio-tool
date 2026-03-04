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
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl text-balance">
            Image Ratio Tool
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Analyze aspect ratios, crop to standard formats, or add borders
          </p>
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
