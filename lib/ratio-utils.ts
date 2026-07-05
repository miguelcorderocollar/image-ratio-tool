export interface StandardRatio {
  name: string
  w: number
  h: number
  decimal: number
  category: string
}

export interface RatioOption {
  label: string
  value: string
}

export interface RatioMatch {
  ratio: StandardRatio
  difference: number
  percentDiff: number
}

export const STANDARD_RATIOS: StandardRatio[] = [
  { name: "1:1", w: 1, h: 1, decimal: 1.0, category: "Social" },
  { name: "4:3", w: 4, h: 3, decimal: 4 / 3, category: "Classic" },
  { name: "3:2", w: 3, h: 2, decimal: 3 / 2, category: "Photo" },
  { name: "16:9", w: 16, h: 9, decimal: 16 / 9, category: "Video" },
  { name: "9:16", w: 9, h: 16, decimal: 9 / 16, category: "Mobile" },
  { name: "2:1", w: 2, h: 1, decimal: 2.0, category: "Panoramic" },
  { name: "21:9", w: 21, h: 9, decimal: 21 / 9, category: "Ultrawide" },
  { name: "5:4", w: 5, h: 4, decimal: 5 / 4, category: "Print" },
  { name: "3:4", w: 3, h: 4, decimal: 3 / 4, category: "Portrait" },
  { name: "2:3", w: 2, h: 3, decimal: 2 / 3, category: "Portrait" },
  { name: "4:5", w: 4, h: 5, decimal: 4 / 5, category: "Social" },
  { name: "1:2", w: 1, h: 2, decimal: 1 / 2, category: "Tall" },
]

export const RATIO_OPTIONS: RatioOption[] = [
  { label: "1:1", value: "1:1" },
  { label: "4:3", value: "4:3" },
  { label: "3:2", value: "3:2" },
  { label: "16:9", value: "16:9" },
  { label: "9:16", value: "9:16" },
  { label: "2:1", value: "2:1" },
  { label: "5:4", value: "5:4" },
  { label: "3:4", value: "3:4" },
  { label: "4:5", value: "4:5" },
  { label: "21:9", value: "21:9" },
]

export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a))
  b = Math.abs(Math.round(b))
  while (b) {
    const t = b
    b = a % b
    a = t
  }
  return a
}

export function simplifyRatio(w: number, h: number): { w: number; h: number } {
  const d = gcd(w, h)
  return { w: w / d, h: h / d }
}

export function getExactRatio(width: number, height: number) {
  const decimal = width / height
  const simplified = simplifyRatio(width, height)
  return {
    width,
    height,
    simplified,
    decimal,
    display: `${simplified.w}:${simplified.h}`,
  }
}

export function findClosestRatios(
  width: number,
  height: number,
  tolerance: number = 0.05,
  maxResults: number = 7
): RatioMatch[] {
  const decimal = width / height

  const matches = STANDARD_RATIOS.map((ratio) => {
    const difference = Math.abs(decimal - ratio.decimal)
    const percentDiff = difference / decimal
    return { ratio, difference, percentDiff }
  })
    .filter((m) => m.percentDiff <= tolerance)
    .sort((a, b) => a.difference - b.difference)
    .slice(0, maxResults)

  return matches
}

export function getCropDimensions(
  srcWidth: number,
  srcHeight: number,
  targetW: number,
  targetH: number
): { x: number; y: number; width: number; height: number } {
  const targetRatio = targetW / targetH
  const srcRatio = srcWidth / srcHeight

  let cropWidth: number
  let cropHeight: number

  if (srcRatio > targetRatio) {
    cropHeight = srcHeight
    cropWidth = srcHeight * targetRatio
  } else {
    cropWidth = srcWidth
    cropHeight = srcWidth / targetRatio
  }

  const x = (srcWidth - cropWidth) / 2
  const y = (srcHeight - cropHeight) / 2

  return { x, y, width: cropWidth, height: cropHeight }
}

export function renderCroppedCanvas(
  image: HTMLImageElement,
  crop: { x: number; y: number; width: number; height: number }
): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(crop.width)
  canvas.height = Math.round(crop.height)

  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height
  )

  return canvas
}

/**
 * Calculate the canvas size and image placement for border mode.
 * The image keeps its original size; borders are added to achieve the target ratio.
 */
export function getBorderDimensions(
  imgWidth: number,
  imgHeight: number,
  targetW: number,
  targetH: number
): {
  canvasWidth: number
  canvasHeight: number
  imgX: number
  imgY: number
  borderTop: number
  borderBottom: number
  borderLeft: number
  borderRight: number
} {
  const targetRatio = targetW / targetH
  const imgRatio = imgWidth / imgHeight

  let canvasWidth: number
  let canvasHeight: number

  if (imgRatio > targetRatio) {
    // Image is wider than target: add top/bottom borders
    canvasWidth = imgWidth
    canvasHeight = Math.round(imgWidth / targetRatio)
  } else if (imgRatio < targetRatio) {
    // Image is taller than target: add left/right borders
    canvasHeight = imgHeight
    canvasWidth = Math.round(imgHeight * targetRatio)
  } else {
    // Already matches
    canvasWidth = imgWidth
    canvasHeight = imgHeight
  }

  const imgX = Math.round((canvasWidth - imgWidth) / 2)
  const imgY = Math.round((canvasHeight - imgHeight) / 2)

  return {
    canvasWidth,
    canvasHeight,
    imgX,
    imgY,
    borderTop: imgY,
    borderBottom: canvasHeight - imgHeight - imgY,
    borderLeft: imgX,
    borderRight: canvasWidth - imgWidth - imgX,
  }
}

/**
 * Sample the average color from the edge pixels of an image via canvas.
 */
export function getAverageEdgeColor(
  image: HTMLImageElement,
  sampleDepth: number = 4
): { r: number; g: number; b: number } {
  const canvas = document.createElement("canvas")
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext("2d")
  if (!ctx) return { r: 0, g: 0, b: 0 }

  ctx.drawImage(image, 0, 0)

  const w = image.width
  const h = image.height
  let totalR = 0
  let totalG = 0
  let totalB = 0
  let count = 0

  // Sample edges
  const regions: Array<[number, number, number, number]> = [
    [0, 0, w, sampleDepth],               // top edge
    [0, h - sampleDepth, w, sampleDepth],  // bottom edge
    [0, 0, sampleDepth, h],               // left edge
    [w - sampleDepth, 0, sampleDepth, h],  // right edge
  ]

  for (const [rx, ry, rw, rh] of regions) {
    const data = ctx.getImageData(rx, ry, rw, rh).data
    for (let i = 0; i < data.length; i += 4) {
      totalR += data[i]
      totalG += data[i + 1]
      totalB += data[i + 2]
      count++
    }
  }

  return {
    r: Math.round(totalR / count),
    g: Math.round(totalG / count),
    b: Math.round(totalB / count),
  }
}
