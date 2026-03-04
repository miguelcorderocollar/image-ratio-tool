"use client"

export function JsonLd() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Image Ratio Tool",
    description:
      "Free online tool to analyze image aspect ratios, crop to standard formats like 16:9, 4:3, 1:1, or add letterbox borders to match any target ratio.",
    url: "https://image-ratio-tool.vercel.app",
    applicationCategory: "DesignApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Person",
      name: "Miguel Cordero Collar",
      url: "https://miguelcorderocollar.com/",
    },
    browserRequirements: "Requires a modern web browser with Canvas support",
    featureList: [
      "Analyze image aspect ratios",
      "Crop images to standard ratios",
      "Add borders to match target ratios",
      "Copy cropped images to clipboard",
      "Download processed images",
      "Paste images from clipboard",
      "Drag and drop support",
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
