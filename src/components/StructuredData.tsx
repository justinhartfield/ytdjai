/**
 * JSON-LD Structured Data for SEO
 * Adds schema.org markup to help search engines understand the app
 */

interface WebApplicationSchemaProps {
  name?: string
  description?: string
  url?: string
}

export function WebApplicationSchema({
  name = 'YTDJ.AI',
  description = 'AI-powered DJ set creator with intelligent music curation and smooth transitions',
  url = 'https://ytdj.ai',
}: WebApplicationSchemaProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    description,
    url,
    applicationCategory: 'MusicApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript. Requires a modern browser.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free tier with 5 credits/month',
    },
    featureList: [
      'AI-powered playlist generation',
      'Intelligent track transitions',
      'Multiple AI providers (OpenAI, Claude, Gemini)',
      'Energy-based track sequencing',
      'YouTube Music integration',
      'Cloud save functionality',
    ],
    screenshot: `${url}/og-image.png`,
    softwareVersion: '1.0.0',
    creator: {
      '@type': 'Organization',
      name: 'YTDJ.AI',
      url,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export function OrganizationSchema() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'YTDJ.AI',
    url: 'https://ytdj.ai',
    logo: 'https://ytdj.ai/icon-512.png',
    description: 'AI-powered DJ set creator',
    sameAs: [], // Add social media links here when available
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export function FAQSchema() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is YTDJ.AI?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'YTDJ.AI is an AI-powered DJ set creator that generates perfectly curated playlists with smooth energy transitions using advanced AI models.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does YTDJ.AI work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Simply describe the vibe or mood you want, and our AI analyzes millions of tracks to create a seamless DJ set with intelligent transitions and energy flow.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is YTDJ.AI free to use?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! YTDJ.AI offers a free tier with 5 credits per month. Pro users get 50 credits monthly plus access to all AI providers.',
        },
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

/**
 * Combined structured data component for the home page
 */
export function HomePageStructuredData() {
  return (
    <>
      <WebApplicationSchema />
      <OrganizationSchema />
      <FAQSchema />
    </>
  )
}
