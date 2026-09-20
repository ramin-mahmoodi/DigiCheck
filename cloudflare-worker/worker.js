/**
 * Cloudflare Worker CORS Proxy for Digikala API
 * 
 * Supports manual redirect following with cookie preservation (bypasses F5/WAF cookie challenge)
 */

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'Missing ?url= parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      const pidMatch = targetUrl.match(/\/product\/(\d+)\//);
      const referer = pidMatch 
        ? `https://www.digikala.com/product/dkp-${pidMatch[1]}/` 
        : 'https://www.digikala.com/';

      let currentUrl = targetUrl;
      const cookieMap = new Map();
      let response;
      let hops = 0;

      while (hops < 6) {
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': referer,
          'Accept-Language': 'fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7',
        };

        if (cookieMap.size > 0) {
          headers['Cookie'] = Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
        }

        response = await fetch(currentUrl, {
          method: 'GET',
          headers: headers,
          redirect: 'manual'
        });

        // Extract all cookies from Set-Cookie (handles comma-separated and multiple cookies)
        const rawCookies = [];
        if (response.headers.getSetCookie) {
          try {
            rawCookies.push(...response.headers.getSetCookie());
          } catch (e) {}
        }
        const singleSetCookie = response.headers.get('set-cookie');
        if (singleSetCookie) rawCookies.push(singleSetCookie);

        const cookieRegex = /(?:^|[\s,;])([A-Za-z0-9_]+)=([^\s,;]+)/g;
        for (const raw of rawCookies) {
          let match;
          while ((match = cookieRegex.exec(raw)) !== null) {
            const key = match[1];
            const val = match[2];
            if (!['path', 'domain', 'expires', 'max-age', 'samesite', 'secure', 'httponly'].includes(key.toLowerCase())) {
              cookieMap.set(key, val);
            }
          }
        }

        // Handle redirect or F5 cookie challenge
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const loc = response.headers.get('Location');
          currentUrl = loc ? new URL(loc, currentUrl).href : currentUrl;
          hops++;
          continue;
        }

        break;
      }

      const body = await response.text();
      return new Response(body, {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': response.headers.get('Content-Type') || 'application/json; charset=utf-8',
          'Cache-Control': response.ok ? 'public, max-age=30' : 'no-cache, no-store, must-revalidate'
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
