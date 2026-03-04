import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://image-ratio-tool.vercel.app'

export const metadata: Metadata = {
  title: {
    default: 'Image Ratio Tool - Analyze, Crop & Add Borders to Any Image',
    template: '%s | Image Ratio Tool',
  },
  description:
    'Free online tool to analyze image aspect ratios, crop to standard formats like 16:9, 4:3, 1:1, or add borders to match any target ratio. Paste, drag-and-drop, or upload — no sign-up required.',
  keywords: [
    'aspect ratio',
    'image crop',
    'image resize',
    'aspect ratio calculator',
    'image border',
    'crop tool',
    '16:9 crop',
    '4:3 crop',
    '1:1 crop',
    'image aspect ratio analyzer',
    'photo crop online',
    'add borders to image',
  ],
  authors: [
    { name: 'Miguel Cordero Collar', url: 'https://miguelcorderocollar.com/' },
  ],
  creator: 'Miguel Cordero Collar',
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Image Ratio Tool',
    title: 'Image Ratio Tool - Analyze, Crop & Add Borders to Any Image',
    description:
      'Free online tool to analyze image aspect ratios, crop to standard formats, or add letterbox borders. Works entirely in your browser — no uploads, no sign-up.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Image Ratio Tool — Analyze, crop, and add borders to images',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Image Ratio Tool - Analyze, Crop & Add Borders',
    description:
      'Free browser-based tool to analyze aspect ratios, crop to standard formats, or add borders. No uploads, no sign-up.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/icon.svg',
  },
  category: 'tool',
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
