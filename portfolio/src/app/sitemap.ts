import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://devfolio-builder.local";
  return ["", "/builder", "/templates", "/preview", "/about"].map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date(),
  }));
}
