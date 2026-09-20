import { OffersDataResponse, ProductChartData, PriceChartHistoryPoint, ProductItem, DiscountAnalysis, DiscountVerdict } from '../types';
import { analyzeDiscountClient } from './dealAnalyzer';

export interface ProxyPreset {
  id: string;
  name: string;
  url: string;
  description: string;
}

export const DEFAULT_PROXIES: ProxyPreset[] = [
  {
    id: 'cf-worker',
    name: 'ورکر کلودفلر (پیش‌فرض)',
    url: 'https://digikala.ramin1378i.workers.dev/?url=',
    description: 'پروکسی اختصاصی کلودفلر - بدون تحریم، پرسرعت و با دور زدن محدودیت‌های CORS',
  },
  {
    id: 'direct',
    name: 'اتصال مستقیم (بدون پروکسی)',
    url: '',
    description: 'اتصال مستقیم بدون واسطه - مناسب محیط‌های محلی یا زمان فعال بودن افزونه CORS',
  },
];

export const PROXY_STORAGE_KEY = 'digicheck_proxy_url';

export function getStoredProxyUrl(): string {
  const saved = localStorage.getItem(PROXY_STORAGE_KEY);
  if (saved !== null) {
    return saved;
  }
  // Default to the dedicated Cloudflare worker
  return 'https://digikala.ramin1378i.workers.dev/?url=';
}

export function setStoredProxyUrl(url: string): void {
  localStorage.setItem(PROXY_STORAGE_KEY, url.trim());
}

export function buildProxyUrl(targetUrl: string, proxyUrl?: string): string {
  const p = (proxyUrl !== undefined ? proxyUrl : getStoredProxyUrl()).trim();
  if (!p) {
    return targetUrl;
  }
  if (p.includes('{url}')) {
    return p.replace('{url}', encodeURIComponent(targetUrl));
  }
  if (p.includes('?url=') || p.endsWith('?url=')) {
    return `${p}${encodeURIComponent(targetUrl)}`;
  }
  if (p.includes('?quest=') || p.endsWith('?quest=')) {
    return `${p}${encodeURIComponent(targetUrl)}`;
  }
  if (p.endsWith('?')) {
    return `${p}${encodeURIComponent(targetUrl)}`;
  }
  if (p.includes('?')) {
    return `${p}&url=${encodeURIComponent(targetUrl)}`;
  }
  return `${p.replace(/\/$/, '')}/${encodeURIComponent(targetUrl)}`;
}

export async function testProxyConnection(proxyUrl: string): Promise<{ success: boolean; latencyMs: number; error?: string }> {
  const startTime = Date.now();
  // Use a fast, highly-available Digikala API endpoint for testing proxy health
  const testTargetUrl = 'https://api.digikala.com/v1/search/?q=mobile';
  const fullUrl = buildProxyUrl(testTargetUrl, proxyUrl);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const res = await fetch(fullUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      let detail = `پاسخ با کد خطای ${res.status} دریافت شد`;
      if (res.status === 401) {
        detail = 'خطای ۴۰۱: این پروکسی نیاز به کلید API دارد.';
      } else if (res.status === 403) {
        detail = 'خطای ۴۰۳: دسترسی از طریق این سرور مسدود شده است.';
      } else if (res.status >= 500) {
        detail = `خطای ${res.status}: سرور پروکسی با اختلال یا تایم‌اوت مواجه شد.`;
      }
      return {
        success: false,
        latencyMs,
        error: detail,
      };
    }

    const data = await res.json();
    if (data?.status === 200 || data?.data) {
      return {
        success: true,
        latencyMs,
      };
    }

    return {
      success: true,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      latencyMs,
      error: err.name === 'AbortError' ? 'مهلت زمان درخواست به پایان رسید (Timeout)' : (err.message || 'خطا در اتصال به پروکسی'),
    };
  }
}

// 100% Live fetching of Incredible Offers directly from Digikala API
export async function fetchOffersData(): Promise<OffersDataResponse> {
  return await fetchLiveOffers();
}

/**
 * Directly calls Digikala price-chart API through candidate proxies.
 * Resilient multi-proxy strategy matching chandchandi.
 */
export async function fetchLiveProductChartDirect(
  productId: number,
  proxyUrl?: string
): Promise<ProductChartData> {
  const targetUrl = `https://api.digikala.com/v1/product/${productId}/price-chart/`;
  
  // Build proxy candidates list:
  const activeProxy = proxyUrl !== undefined ? proxyUrl.trim() : getStoredProxyUrl().trim();
  const candidateProxies: string[] = [];

  if (activeProxy) {
    candidateProxies.push(activeProxy);
  }

  // Add default public fallbacks matching chandchandi
  const commonFallbacks = [
    '', // Direct
    'https://api.allorigins.win/raw?url=',
    'https://api.codetabs.com/v1/proxy?quest=',
  ];
  for (const fb of commonFallbacks) {
    if (!candidateProxies.includes(fb)) {
      candidateProxies.push(fb);
    }
  }

  let lastError: any = null;

  for (const pUrl of candidateProxies) {
    const fetchUrl = buildProxyUrl(targetUrl, pUrl);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);

      const res = await fetch(fetchUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        lastError = new Error(`پروکسی با کد ${res.status} پاسخ داد`);
        continue;
      }

      const json = await res.json();
      const pc = json?.data?.price_chart || [];
      let history: PriceChartHistoryPoint[] = [];

      if (Array.isArray(pc)) {
        for (const item of pc) {
          if (Array.isArray(item.history) && item.history.length > 0) {
            history = item.history;
            break;
          }
        }
      }

      if (!history || history.length === 0) {
        throw new Error('تاریخچه قیمتی برای این کالا در دیجی‌کالا یافت نشد.');
      }

      const lastPoint = history[history.length - 1];
      const sellingPrice = lastPoint.selling_price || 0;
      const rrpPrice = lastPoint.rrp_price || sellingPrice;
      const discountPercent = rrpPrice > sellingPrice ? Math.round((1 - sellingPrice / rrpPrice) * 100) : 0;

      const analysis = analyzeDiscountClient(sellingPrice, rrpPrice, discountPercent, history);

      return {
        product_id: productId,
        title: `کالای کد ${productId}`,
        selling_price: sellingPrice,
        rrp_price: rrpPrice,
        analysis,
        history,
        is_live: true,
      };
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('خطا در استعلام چارت کالا از طریق پروکسی');
}

export interface FetchChartResult {
  data: ProductChartData;
  source: 'live';
  latencyMs?: number;
}

/**
 * Primary chart fetching function:
 * Directly requests the live price chart from Digikala API via CORS proxy
 */
export async function fetchProductChartWithFallback(
  productId: number,
  proxyUrl?: string
): Promise<FetchChartResult> {
  const startTime = Date.now();
  const liveData = await fetchLiveProductChartDirect(productId, proxyUrl);
  return {
    data: liveData,
    source: 'live',
    latencyMs: Date.now() - startTime,
  };
}

// Backward-compatible alias for manual checker / components
export async function fetchLiveProductChart(
  productId: number,
  proxyUrl?: string
): Promise<ProductChartData> {
  const result = await fetchProductChartWithFallback(productId, proxyUrl);
  return result.data;
}

export function computeLiveDealVerdict(p: any): DiscountAnalysis {
  const priceInfo = p.default_variant?.price || {};
  const sellingPrice = priceInfo.selling_price || 0;
  const rrpPrice = priceInfo.rrp_price || sellingPrice;
  const discountPercent = priceInfo.discount_percent || 0;
  const minPriceLastMonth = p.properties?.min_price_in_last_month || 0;
  const hasBestPriceInLastMonth = p.default_variant?.has_best_price_in_last_month || false;

  let verdict: DiscountVerdict = 'NEUTRAL';
  let verdictLabel = 'تخفیف جزئی';
  let verdictColor: DiscountAnalysis['verdict_color'] = 'blue';
  let score = 55;
  let reason = 'تخفیف عادی در جشنواره شگفت‌انگیز دیجی‌کالا.';

  const min30d = minPriceLastMonth > 0 ? minPriceLastMonth : sellingPrice;

  if (hasBestPriceInLastMonth || (minPriceLastMonth > 0 && sellingPrice <= minPriceLastMonth)) {
    verdict = 'REAL_GREAT';
    verdictLabel = 'تخفیف واقعی (کف قیمت ماه)';
    verdictColor = 'green';
    score = 92;
    reason = 'قیمت فعلی کالا در کمترین رقم ثبت‌شده ۳۰ روز گذشته قرار دارد.';
  } else if (minPriceLastMonth > 0 && sellingPrice > minPriceLastMonth * 1.05) {
    verdict = 'FAKE_UNCHANGED';
    verdictLabel = 'تخفیف صوری (گران‌تر از کف ماه)';
    verdictColor = 'orange';
    score = 35;
    const diff = Math.round(((sellingPrice - minPriceLastMonth) / minPriceLastMonth) * 100);
    reason = `این کالا در ۳۰ روز گذشته با قیمت پایین‌تری (${Math.round(minPriceLastMonth / 10).toLocaleString('fa-IR')} تومان) عرضه شده بود (${diff.toLocaleString('fa-IR')}٪ گران‌تر از کف).`;
  } else if (discountPercent >= 30) {
    verdict = 'REAL_MODERATE';
    verdictLabel = 'تخفیف منصفانه';
    verdictColor = 'emerald';
    score = 75;
    reason = `تخفیف مناسب ${discountPercent.toLocaleString('fa-IR')} درصدی نسبت به قیمت پایه محصول.`;
  } else if (discountPercent > 0) {
    verdict = 'NEUTRAL';
    verdictLabel = 'تخفیف جزئی';
    verdictColor = 'blue';
    score = 55;
    reason = `تخفیف متداول ${discountPercent.toLocaleString('fa-IR')} درصدی دیجی‌کالا.`;
  }

  return {
    verdict,
    verdict_label: verdictLabel,
    verdict_color: verdictColor,
    score,
    reason,
    min_30d: min30d,
    max_30d: rrpPrice,
    avg_30d: Math.round((sellingPrice + rrpPrice) / 2),
    price_diff_30d_min: sellingPrice - min30d,
    price_diff_percent: discountPercent,
    is_all_time_low: hasBestPriceInLastMonth,
    rrp_inflated: false,
  };
}

function mapRawToProductItem(p: any, offerKey: string, offerTitle: string): ProductItem {
  const pid = p.id;
  const priceInfo = p.default_variant?.price || {};
  const selling = priceInfo.selling_price || 0;
  const rrp = priceInfo.rrp_price || selling;
  const discount = priceInfo.discount_percent || 0;

  const images = p.images || {};
  const mainImg = Array.isArray(images.main?.url) && images.main.url.length > 0
    ? images.main.url[0]
    : (typeof images.main?.url === 'string' ? images.main.url : '');

  const catTitle = p.data_layer?.item_category2 || p.category?.title || 'سایر';
  const catId = p.category?.id || null;
  const uri = p.url?.uri || `/product/dkp-${pid}/`;

  const analysis = computeLiveDealVerdict(p);

  return {
    id: pid,
    title_fa: p.title_fa || '',
    title_en: p.title_en || '',
    image: mainImg,
    selling_price: selling,
    rrp_price: rrp,
    discount_percent: discount,
    rating: p.rating?.rate || 0,
    rating_count: p.rating?.count || 0,
    category_id: catId,
    category_title: catTitle,
    url: `https://www.digikala.com${uri}`,
    offer_type: offerKey,
    offer_type_title: offerTitle,
    has_chart: false,
    analysis,
  };
}

/**
 * Live fetch for the entire Incredible Offers dataset directly from Digikala API.
 * Combines the featured landing page sections with live paginated products to load 150+ products.
 */
export async function fetchLiveOffers(proxyUrl?: string): Promise<OffersDataResponse> {
  const activeProxy = proxyUrl !== undefined ? proxyUrl : getStoredProxyUrl();
  const landingUrl = buildProxyUrl('https://api.digikala.com/v1/incredible-offers/', activeProxy);

  // Fetch landing page and multiple pages of all incredible offers in parallel
  const fetchJson = async (target: string) => {
    const u = buildProxyUrl(target, activeProxy);
    const r = await fetch(u, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error(`خطا در اتصال به دیجی‌کالا (${r.status})`);
    return await r.json();
  };

  // Fetch landing + 15 catalog pages in parallel to load 300+ products (matching the full 299+ catalog)
  const pagePromises = Array.from({ length: 15 }, (_, i) =>
    fetchJson(`https://api.digikala.com/v1/incredible-offers/products/?page=${i + 1}`).catch(() => null)
  );

  const [landingJson, ...pageResults] = await Promise.all([
    fetchJson('https://api.digikala.com/v1/incredible-offers/'),
    ...pagePromises,
  ]);

  const rawData = landingJson?.data || {};

  const OFFER_KEYS: Record<string, { title: string; badge: string; icon: string }> = {
    'all_offers_list': { title: 'همه شگفت‌انگیزها', badge: 'کاتالوگ زنده', icon: 'Layers' },
    'incredible_products_list': { title: 'شگفت‌انگیز روز', badge: 'عمومی', icon: 'Sparkles' },
    'lightening_deal_products': { title: 'پیشنهاد صاعقه‌ای', badge: 'تخفیف ویژه', icon: 'Zap' },
    'running_out_incredible_products': { title: 'فرصت پایانی', badge: 'در حال اتمام', icon: 'Flame' },
    'fresh_incredible_products': { title: 'شگفت‌انگیز سوپرمارکتی', badge: 'تندمصرف (FMCG)', icon: 'ShoppingBag' },
    'digiplus_incredible_products': { title: 'شگفت‌انگیز دیجی‌پلاس', badge: 'دیجی‌پلاس', icon: 'Eye' },
  };

  const offerCategories: Record<string, any> = {};
  const seenProductIds = new Set<number>();
  const stats = {
    real_deals_count: 0,
    fake_deals_count: 0,
    neutral_deals_count: 0,
    great_deals_count: 0,
    max_discount: 0,
  };

  // Collect paginated products into all_offers_list
  const paginatedRawProducts: any[] = [];
  for (const pRes of pageResults) {
    if (Array.isArray(pRes?.data?.products)) {
      paginatedRawProducts.push(...pRes.data.products);
    }
  }

  // Populate landing page categories
  for (const [key, meta] of Object.entries(OFFER_KEYS)) {
    let rawList: any[] = [];
    if (key === 'all_offers_list') {
      rawList = paginatedRawProducts;
    } else {
      const catData = rawData[key] || {};
      rawList = Array.isArray(catData.products) ? catData.products : [];
    }

    const products: ProductItem[] = rawList.map((p: any) => {
      const item = mapRawToProductItem(p, key, meta.title);
      if (!seenProductIds.has(item.id)) {
        seenProductIds.add(item.id);
        if (item.discount_percent > stats.max_discount) {
          stats.max_discount = item.discount_percent;
        }
        if (item.analysis?.verdict === 'REAL_GREAT') {
          stats.real_deals_count++;
          stats.great_deals_count++;
        } else if (item.analysis?.verdict === 'REAL_MODERATE') {
          stats.real_deals_count++;
        } else if (item.analysis?.verdict === 'FAKE_UNCHANGED' || item.analysis?.verdict === 'FAKE_INFLATED') {
          stats.fake_deals_count++;
        } else {
          stats.neutral_deals_count++;
        }
      }
      return item;
    });

    offerCategories[key] = {
      key,
      title: meta.title,
      badge: meta.badge,
      icon: meta.icon,
      count: products.length,
      products,
    };
  }

  const now = new Date();
  const timePart = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  const datePart = now.toLocaleDateString('fa-IR');

  return {
    last_updated: now.toISOString(),
    last_updated_fa: `${timePart} (${datePart}) - زنده`,
    total_products: seenProductIds.size,
    stats,
    main_categories: rawData.main_categories || [],
    offer_categories: offerCategories,
  };
}

// Utility to parse Digikala URL or ID
export function extractProductId(input: string): number | null {
  if (!input) return null;
  const clean = input.trim();
  // e.g. 4545846
  if (/^\d+$/.test(clean)) {
    return parseInt(clean, 10);
  }
  // e.g. /product/dkp-4545846/... or https://www.digikala.com/product/dkp-4545846/...
  const match = clean.match(/dkp-(\d+)/i) || clean.match(/\/product\/(\d+)/i) || clean.match(/product.*?(\d{5,})/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}
