import { OffersDataResponse, ProductChartData, PriceChartHistoryPoint, ProductItem, DiscountAnalysis } from '../types';
import { analyzeDiscountClient } from './dealAnalyzer';

// In-memory cache to avoid redundant requests on repetitive clicks
const chartMemoryCache = new Map<number, ProductChartData>();

/**
 * Loads the latest analyzed deals dataset generated automatically by GitHub Actions.
 */
export async function fetchOffersData(): Promise<OffersDataResponse> {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const dataUrl = `${baseUrl.replace(/\/$/, '')}/data/deals.json?t=${Date.now()}`;

  const res = await fetch(dataUrl);
  if (!res.ok) {
    throw new Error(`خطا در بارگذاری فایل داده‌ها (${res.status}). لطفاً مطمئن شوید گیت‌هاب اکشن اجرا شده است.`);
  }

  const data: OffersDataResponse = await res.json();
  return data;
}

export interface FetchChartResult {
  data: ProductChartData;
  source: 'cache' | 'live';
  latencyMs?: number;
}

/**
 * Fetches the 30-day price chart for a product.
 * Reads the authentic chart JSON saved by GitHub Actions in `data/charts/{productId}.json`.
 * If unavailable, falls back to direct Digikala API query.
 */
export async function fetchProductChart(productId: number): Promise<ProductChartData> {
  if (chartMemoryCache.has(productId)) {
    return chartMemoryCache.get(productId)!;
  }

  const baseUrl = import.meta.env.BASE_URL || '/';
  const chartFileUrl = `${baseUrl.replace(/\/$/, '')}/data/charts/${productId}.json`;

  try {
    const res = await fetch(chartFileUrl);
    if (res.ok) {
      const chartJson = await res.json();
      if (chartJson && chartJson.history && Array.isArray(chartJson.history)) {
        chartMemoryCache.set(productId, chartJson);
        return chartJson;
      }
    }
  } catch (err) {
    console.warn(`[DigiCheck] Local chart not found for product ${productId}, checking direct API:`, err);
  }

  // Fallback: direct Digikala API request (works on Iran residential IPs / CORS-enabled environments)
  const targetUrl = `https://api.digikala.com/v1/product/${productId}/price-chart/`;
  try {
    const directRes = await fetch(targetUrl, {
      headers: { Accept: 'application/json' },
    });
    if (directRes.ok) {
      const json = await directRes.json();
      if (json?.status === 200) {
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
        if (history.length > 0) {
          const lastPoint = history[history.length - 1];
          const sellingPrice = lastPoint.selling_price || 0;
          const rrpPrice = lastPoint.rrp_price || sellingPrice;
          const discountPercent = rrpPrice > sellingPrice ? Math.round((1 - sellingPrice / rrpPrice) * 100) : 0;
          const analysis = analyzeDiscountClient(sellingPrice, rrpPrice, discountPercent, history);

          const result: ProductChartData = {
            product_id: productId,
            title: `کالای کد ${productId}`,
            selling_price: sellingPrice,
            rrp_price: rrpPrice,
            analysis,
            history,
            is_live: true,
          };
          chartMemoryCache.set(productId, result);
          return result;
        }
      }
    }
  } catch (e) {
    // Ignore fallback failure
  }

  throw new Error('اطلاعات نمودار قیمت برای این کالا در دسترس نیست.');
}

/**
 * Wrapper for fetching product chart with latency measurement
 */
export async function fetchProductChartWithFallback(productId: number): Promise<FetchChartResult> {
  const startTime = Date.now();
  const data = await fetchProductChart(productId);
  return {
    data,
    source: data.is_live ? 'live' : 'cache',
    latencyMs: Date.now() - startTime,
  };
}

// Backward-compatible alias
export async function fetchLiveProductChart(productId: number): Promise<ProductChartData> {
  return await fetchProductChart(productId);
}

// Utility to parse Digikala URL or ID
export function extractProductId(input: string): number | null {
  if (!input) return null;
  const clean = input.trim();
  if (/^\d+$/.test(clean)) {
    return parseInt(clean, 10);
  }
  const match = clean.match(/dkp-(\d+)/i) || clean.match(/\/product\/(\d+)/i) || clean.match(/product.*?(\d{5,})/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}
