# Image Ratio Tool

Browser-based image aspect ratio utility for analyzing dimensions, cropping to common formats, adding borders, and creating diagonal cuts.

Live app: [image-ratio-tool.vercel.app](https://image-ratio-tool.vercel.app)

## What It Does

- Detects the exact ratio of any uploaded, pasted, or dropped image
- Suggests standard target ratios such as `1:1`, `4:3`, `3:2`, `16:9`, and `9:16`
- Crops images to a selected ratio with preview and export
- Adds borders to fit a target canvas ratio
- Supports border fills including solid color, average edge color, blur, and gradient
- Applies configurable diagonal cuts to any side of the image
- Copies generated output directly to the clipboard or downloads it as a PNG

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
