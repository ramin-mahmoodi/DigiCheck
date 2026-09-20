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
      'Access-Control-Max-Age': '86400',
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
      let currentUrl = targetUrl;
      const cookieMap = new Map();
      cookieMap.set('tracker_session', Math.random().toString(36).substring(2, 10));

      let response;
      let hops = 0;
      const maxHops = 5;

      while (hops < maxHops) {
        const headers = new Headers();
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        headers.set('Accept', 'application/json, text/plain, */*');
        headers.set('Referer', 'https://www.digikala.com/');
        headers.set('Accept-Language', 'fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7');

        if (cookieMap.size > 0) {
          const cookieStr = Array.from(cookieMap.entries())
            .map(([k, v]) => `${k}=${v}`)
            .join('; ');
          headers.set('Cookie', cookieStr);
        }

        response = await fetch(currentUrl, {
          method: 'GET',
          headers: headers,
          redirect: 'manual'
        });

        // Collect cookies across redirect hops
        const setCookieHeaders = response.headers.getSetCookie 
          ? response.headers.getSetCookie() 
          : [response.headers.get('set-cookie')].filter(Boolean);

        for (const raw of setCookieHeaders) {
          const cookiePart = raw.split(';')[0];
          const eqIdx = cookiePart.indexOf('=');
          if (eqIdx > 0) {
            const key = cookiePart.substring(0, eqIdx).trim();
            const val = cookiePart.substring(eqIdx + 1).trim();
            cookieMap.set(key, val);
          }
        }

        // Handle redirects manually
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get('Location');
          if (location) {
            currentUrl = new URL(location, currentUrl).href;
            hops++;
            continue;
          }
        }

        break;
      }

      const body = await response.text();
      return new Response(body, {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': response.headers.get('Content-Type') || 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=60'
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
