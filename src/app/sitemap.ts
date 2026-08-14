import type { MetadataRoute } from "next";
import { env } from "~/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/login", "/signup", "/help"];

  return routes.map((route) => ({
    url: `${env.NEXT_PUBLIC_SITE_URL}${route}`,
  }));
}
