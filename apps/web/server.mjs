import { join } from "node:path";
import server from "./dist/server/server.js";

const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const CLIENT_DIR = join(import.meta.dir, "dist/client");

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Healthcheck endpoint for container orchestration
    if (url.pathname === "/_health" || url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", runtime: "tanstack-start-ssr" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Static asset serving (e.g. JS chunks, CSS, icons)
    if (
      url.pathname.startsWith("/assets/") ||
      url.pathname === "/styles.css" ||
      url.pathname === "/favicon.ico"
    ) {
      const filePath = join(CLIENT_DIR, url.pathname);
      const file = Bun.file(filePath);
      if (await file.exists()) {
        const headers = new Headers();
        if (url.pathname.startsWith("/assets/")) {
          headers.set("Cache-Control", "public, max-age=31536000, immutable");
        }
        return new Response(file, { headers });
      }
    }

    // SSR Handler for TanStack Start
    return server.fetch(req);
  },
});

console.log(`[autuax-web] TanStack Start SSR server running on port ${PORT}`);
