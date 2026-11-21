import type { MetadataRoute } from "next";
import { HUB_GAMES } from "@/lib/games-registry";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const ogImage = `${SITE_URL}/og-banner.png`;
  const routes: { path: string; priority: number }[] = [
    { path: "/", priority: 1.0 },
    ...HUB_GAMES.map((g) => ({ path: g.path, priority: g.priority })),
    { path: "/deck", priority: 0.88 },
    { path: "/party", priority: 0.85 },
  ];

  return routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: r.priority,
    images: [ogImage],
  }));
}
