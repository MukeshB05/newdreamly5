const UPSTREAM = "https://jiosaavndev.vercel.app/api";

const ALLOWED_PREFIXES = [
  "/search",
  "/songs",
  "/albums",
  "/artists",
  "/playlists",
];

const isAllowedPath = (pathname) =>
  ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

export default async function handler(req, res) {
  const requestUrl = new URL(
    req.url || "/api",
    `https://${req.headers.host || "localhost"}`
  );

  if (req.method === "OPTIONS") {
    res
      .status(204)
      .setHeader("Access-Control-Allow-Origin", "*")
      .setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
      .setHeader("Access-Control-Allow-Headers", "Content-Type")
      .setHeader("Access-Control-Max-Age", "86400")
      .end();
    return;
  }

  if (req.method !== "GET") {
    res
      .status(405)
      .setHeader("Allow", "GET, OPTIONS")
      .json({ error: "Method not allowed" });
    return;
  }

  const pathname = requestUrl.pathname.replace(/^\/api/, "") || "/";
  if (!isAllowedPath(pathname)) {
    res.status(404).json({ error: "API route not found" });
    return;
  }

  const target = new URL(`${UPSTREAM}${pathname}`);
  target.search = requestUrl.search;

  try {
    const upstream = await fetch(target.toString(), {
      method: "GET",
      headers: {
        Accept: req.headers.accept || "application/json",
      },
    });

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60",
    };

    const contentType = upstream.headers.get("content-type");
    if (contentType) headers["Content-Type"] = contentType;

    res.status(upstream.status);
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));

    const body = Buffer.from(await upstream.arrayBuffer());
    res.end(body);
  } catch (error) {
    res.status(502).json({
      error: error?.message || "Unable to reach the music API",
    });
  }
}
