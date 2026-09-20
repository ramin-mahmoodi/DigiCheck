/**
 * Cloudflare Worker CORS Proxy for Digikala API
 * 
 * How to deploy:
 * 1. Create a free account at https://workers.cloudflare.com/
 * 2. Create a new Worker and paste this code.
 * 3. Save & Deploy.
 * 4. Put your worker URL (e.g. https://my-digicheck.your-subdomain.workers.dev/?url=) in the DigiCheck site settings!
 */

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, User-Agent, Authorization',
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
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://www.digikala.com/',
          'Origin': 'https://www.digikala.com',
          'Accept': 'application/json, text/plain, */*',
        }
      });

      const data = await response.text();
      return new Response(data, {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': response.headers.get('Content-Type') || 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=60',
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Proxy request failed', details: err.message }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
