# Image Ratio Tool

Browser-based image utility for analyzing aspect ratios, exporting crops, expanding images to new canvas ratios, and creating diagonal transparent cutouts.

Live app: [image-ratio-tool.vercel.app](https://image-ratio-tool.vercel.app)

## What It Does

- Detects the exact ratio of any uploaded, pasted, or dropped image
- Suggests nearby standard aspect ratios such as `1:1`, `4:3`, `3:2`, `16:9`, and `9:16`
- Lets you preview, move, and resize a crop box before copying or downloading the cropped PNG
- Expands the canvas to a target ratio without resizing the original image
- Supports border fills including black, white, custom color, sampled edge color, blur, and gradient
- Lets you configure diagonal cuts on any combination of sides with per-side angle controls
- Exports diagonal cuts as transparent PNGs
- Copies generated output directly to the clipboard or downloads it as a PNG

## Modes

### Crop Mode

Analyze the image's current aspect ratio, compare it against common presets, then fine-tune the crop area before exporting.

### Border Mode

Keep the original image intact and add space around it until it fits a target ratio. Borders can use solid fills, a picked color, an average edge color, a blur treatment, or a gradient.

### Diagonal Cut

Create transparent cutouts by slicing one or more edges at adjustable angles, then export the result as a PNG.

## Privacy

Image processing happens in the browser. Images are not uploaded to an application server.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Radix UI primitives
- Vercel Analytics

## Local Development

Requirements:

- Node.js 20+
- pnpm

Install dependencies and start the dev server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
```

## Deployment

The production deployment is hosted on Vercel at [image-ratio-tool.vercel.app](https://image-ratio-tool.vercel.app).

To deploy your own copy:

1. Create a Vercel project from this repository.
2. Set `NEXT_PUBLIC_SITE_URL` to your production URL.
3. Deploy the default branch.

## Repository Notes

- Main application entry: `app/page.tsx`
- SEO metadata: `app/layout.tsx`
- Structured data: `components/json-ld.tsx`
- Ratio and canvas helpers: `lib/ratio-utils.ts`

## License

[MIT](./LICENSE)
