import { SITE_NAME, SITE_URL } from "@/lib/seo";

interface GameJsonLdProps {
  name: string;
  description: string;
  path: string;
  skill: string;
}

/** Emits BreadcrumbList + LearningResource JSON-LD for each mini-game page. */
export function GameJsonLd({ name, description, path, skill }: GameJsonLdProps) {
  const url = `${SITE_URL}${path}`;
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: SITE_NAME,
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name,
            item: url,
          },
        ],
      },
      {
        "@type": "LearningResource",
        name: `${name} — ${SITE_NAME}`,
        description,
        url,
        inLanguage: ["vi", "en"],
        isAccessibleForFree: true,
        educationalUse: "practice",
        learningResourceType: "Interactive Game",
        educationalLevel: "IELTS Band 5.0 - 9.0",
        teaches: skill,
        image: `${SITE_URL}/og-banner.png`,
        provider: {
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_URL,
        },
      },
    ],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />;
}
