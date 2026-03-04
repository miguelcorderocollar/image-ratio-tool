export interface StandardRatio {
  name: string
  w: number
  h: number
  decimal: number
  category: string
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
