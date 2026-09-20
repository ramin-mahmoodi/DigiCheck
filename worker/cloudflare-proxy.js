/**
 * Cloudflare Worker - Digikala API CORS Proxy (Optional)
 *
 * This worker enables client-side requests to Digikala APIs by bypassing CORS
 * and setting browser-like headers (User-Agent, Origin, Referer).
 *
 * Free Tier on Cloudflare: 100,000 requests/day.
 * Deploy via dash.cloudflare.com -> Workers & Pages -> Create Worker.
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    const url = new URL(request.url);
    // Target URL is passed after worker host, e.g.:
    // https://your-worker.workers.dev/https://api.digikala.com/v1/product/4545846/price-chart/
    let target = url.pathname.slice(1) + url.search;

    if (!target.startsWith("http")) {
      return new Response(JSON.stringify({ error: "Invalid target URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    try {
      const response = await fetch(target, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Referer": "https://www.digikala.com/",
          "Origin": "https://www.digikala.com",
          "Accept": "application/json, text/plain, */*",
        },
      });

      const data = await response.text();
      return new Response(data, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("Content-Type") || "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};
