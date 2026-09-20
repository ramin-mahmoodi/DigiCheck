export type DiscountVerdict = 
  | 'REAL_GREAT'          // Lowest price in 30d / all time
  | 'REAL_MODERATE'       // Fair discount, cheaper than yesterday & below 30d avg
  | 'FAKE_INFLATED'       // RRP artificially increased to show high %
  | 'FAKE_UNCHANGED'      // Same price as previous days, just labeled incredible
  | 'FAKE_MORE_EXPENSIVE' // Current price is higher than yesterday
  | 'NEUTRAL'             // Minor fluctuation
  | 'UNKNOWN';            // No chart data

export interface DiscountAnalysis {
  verdict: DiscountVerdict;
  verdict_label: string;
  verdict_color: 'green' | 'emerald' | 'red' | 'orange' | 'blue' | 'gray';
  score: number;
  reason: string;
  min_30d: number;
  max_30d: number;
  avg_30d: number;
  price_diff_30d_min: number;
  price_diff_percent: number;
  is_all_time_low: boolean;
  rrp_inflated: boolean;
  prev_selling?: number;
  prev_rrp?: number;
}

export interface ProductItem {
  id: number;
  title_fa: string;
  title_en: string;
  image: string;
  selling_price: number;
  rrp_price: number;
  discount_percent: number;
  rating: number;
  rating_count: number;
  category_id: number | null;
  category_title?: string;
  url: string;
  offer_type: string;
  offer_type_title: string;
  has_chart: boolean;
  analysis: DiscountAnalysis | null;
}

export interface OfferCategory {
  key: string;
  title: string;
  badge: string;
  icon: string;
  count: number;
  products: ProductItem[];
}

export interface MainCategory {
  id: number | null;
  title: string;
  image: string;
  code?: string | null;
}

export interface OffersDataResponse {
  last_updated: string;
  last_updated_fa: string;
  total_products: number;
  stats: Record<string, number>;
  main_categories: MainCategory[];
  offer_categories: Record<string, OfferCategory>;
}

export interface PriceChartHistoryPoint {
  selling_price: number;
  rrp_price: number;
  day: string;
  seller?: string;
  product_warranty?: string;
  is_marketable?: boolean;
}

export interface ProductChartData {
  product_id: number;
  title: string;
  selling_price: number;
  rrp_price: number;
  analysis: DiscountAnalysis;
  history: PriceChartHistoryPoint[];
}
