/**
 * Cloudflare Worker CORS Proxy for Digikala API
 * 
 * Supports manual redirect following with cookie preservation (bypasses F5/WAF cookie challenge)
 * Supports pre-warming session for protected endpoints like price-chart
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

      const cookieMap = new Map();

      const parseCookies = (res) => {
        const rawCookies = [];
        if (res.headers.getSetCookie) {
          try {
            rawCookies.push(...res.headers.getSetCookie());
          } catch (e) {}
        }
        const singleSetCookie = res.headers.get('set-cookie');
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
      };

      // Pre-warm security cookies on referer for price-chart / product endpoints
      if (targetUrl.includes('price-chart') || targetUrl.includes('/product/')) {
        try {
          const warmRes = await fetch(referer, {
            method: 'HEAD',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36',
              'Accept': '*/*',
            }
          });
          parseCookies(warmRes);
        } catch (e) {}
      }

      let currentUrl = targetUrl;
      let response;
      let hops = 0;

      while (hops < 6) {
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36',
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

        parseCookies(response);

        // Handle redirect or F5 cookie challenge
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const loc = response.headers.get('Location');
          currentUrl = loc ? new URL(loc, currentUrl).href : currentUrl;
          hops++;
          continue;
        }

        // If rate limit / anti-bot 400 or 429 occurs on first attempt without cookies, warm up and retry once
        if ((response.status === 400 || response.status === 429) && hops === 0 && cookieMap.size === 0) {
          try {
            const warmRes = await fetch(referer, {
              method: 'HEAD',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36',
              }
            });
            parseCookies(warmRes);
            hops++;
            continue;
          } catch (e) {}
        }

        break;
      }

      const body = await response.text();
      return new Response(body, {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': response.headers.get('Content-Type') || 'application/json; charset=utf-8',
          'Cache-Control': response.ok ? 'public, max-age=60' : 'no-cache, no-store, must-revalidate'
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
