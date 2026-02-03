import { serve } from "bun";
import { createCanvas } from "canvas";
import * as echarts from "echarts";
import { randomUUID } from "crypto";

const PORT = 3001;
const BASE_URL = process.env.CHARTSHOT_URL || `http://localhost:${PORT}`;

// Cache configuration
const imageCache = new Map<string, { buffer: Buffer; createdAt: number }>();
const IMAGE_TTL_MS = 36000000; // 10 hours
const MAX_CACHE_ENTRIES = 10000;
const MAX_REQUEST_SIZE = 1_000_000; // 1MB

// Cleanup expired images every minute
setInterval(() => {
  const now = Date.now();
  for (const [id, img] of imageCache) {
    if (now - img.createdAt > IMAGE_TTL_MS) {
      imageCache.delete(id);
    }
  }
}, 60000);

// Load theme with fallback
const defaultTheme = { roma: {}, default: {} };
const theme = (await fetch(
  `${process.env.APITOOLKIT_URL}/public/assets/echart-theme.json`,
)
  .then((res) => res.json())
  .catch((err) => {
    console.error("Failed to load theme, using defaults:", err);
    return defaultTheme;
  })) as { roma: any; default: any };

serve({
  port: PORT,
  fetch: async (req: Request) => {
    try {
      const url = new URL(req.url);

      // Health check endpoint
      if (req.method === "GET" && url.pathname === "/health") {
        return new Response(
          JSON.stringify({ status: "ok", cacheSize: imageCache.size }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // POST /render - accepts pre-built ECharts options from monoscope
      if (req.method === "POST" && url.pathname === "/render") {
        return handleRenderPost(req);
      }

      // GET /images/:id.png - serve cached images
      const imageMatch = url.pathname.match(/^\/images\/([a-f0-9-]+)\.png$/);
      if (req.method === "GET" && imageMatch) {
        return handleImageGet(imageMatch[1]);
      }

      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error:", error);
      return new Response(JSON.stringify({ error: "Internal server error." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});

console.log(`Server is running on http://localhost:${PORT}`);

async function handleRenderPost(req: Request): Promise<Response> {
  try {
    // Check content length before parsing
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    const bodyText = await req.text();
    if (bodyText.length > MAX_REQUEST_SIZE) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = JSON.parse(bodyText);
    const {
      echarts: echartsOptions,
      width = 600,
      height = 300,
      theme: thm = "default",
    } = body;

    if (!echartsOptions) {
      return new Response(
        JSON.stringify({ error: "Missing echarts options" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate dimensions
    const safeWidth = Math.min(Math.max(width, 100), 2000);
    const safeHeight = Math.min(Math.max(height, 100), 2000);

    // Render chart to PNG
    const buffer = renderChartFromOptions(
      echartsOptions,
      safeWidth,
      safeHeight,
      thm,
    );

    // Evict oldest entry if cache is full
    if (imageCache.size >= MAX_CACHE_ENTRIES) {
      let oldest: [string, { createdAt: number }] | null = null;
      for (const entry of imageCache.entries()) {
        if (!oldest || entry[1].createdAt < oldest[1].createdAt) {
          oldest = entry as [string, { createdAt: number }];
        }
      }
      if (oldest) imageCache.delete(oldest[0]);
    }

    // Store in cache with UUID
    const id = randomUUID();
    imageCache.set(id, { buffer, createdAt: Date.now() });

    // Return URL to the cached image
    const imageUrl = `${BASE_URL}/images/${id}.png`;
    return Response.json({ url: imageUrl });
  } catch (error) {
    console.error("Error in /render:", error);
    return new Response(JSON.stringify({ error: "Failed to render chart" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function handleImageGet(id: string): Response {
  const img = imageCache.get(id);
  if (!img) {
    return new Response("Image not found", { status: 404 });
  }
  return new Response(img.buffer, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

function renderChartFromOptions(
  options: any,
  width: number,
  height: number,
  thm: string,
): Buffer {
  const canvas = createCanvas(width, height);
  echarts.registerTheme("default", theme.default);
  echarts.registerTheme("roma", theme.roma);
  const chart = echarts.init(canvas as any, thm);

  // Ensure animation is disabled for server-side rendering
  options.animation = false;
  options.backgroundColor = options.backgroundColor || "#ffffff";

  chart.setOption(options);
  const buffer = canvas.toBuffer("image/png");
  chart.dispose();
  return buffer;
}
