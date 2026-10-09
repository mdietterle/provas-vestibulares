import { Helmet } from 'react-helmet-async'

const SITE_URL = 'https://prova-online.vercel.app'
const DEFAULT_IMAGE = `${SITE_URL}/docs/screenshots/login.png`

interface SeoProps {
  title: string
  description: string
  path: string
  image?: string
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

export default function Seo({ title, description, path, image, jsonLd }: SeoProps) {
  const url = `${SITE_URL}${path}`
  const ogImage = image ?? DEFAULT_IMAGE

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  )
}
