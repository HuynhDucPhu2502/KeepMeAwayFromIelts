import type { MetadataRoute } from "next";
import { SITE_URL } from "./seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, freq: "weekly" },
    { path: "/writing", priority: 0.9, freq: "weekly" },
    { path: "/listening", priority: 0.9, freq: "weekly" },
    { path: "/blitz", priority: 0.85, freq: "weekly" },
    { path: "/scramble", priority: 0.85, freq: "weekly" },
    { path: "/speaking", priority: 0.9, freq: "weekly" },
    { path: "/party", priority: 0.8, freq: "weekly" },
  ];

  return routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }));
}
