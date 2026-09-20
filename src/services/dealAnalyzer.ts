import { DiscountAnalysis, DiscountVerdict, PriceChartHistoryPoint } from '../types';

export function analyzeDiscountClient(
  sellingPrice: number,
  rrpPrice: number,
  discountPercent: number,
  history: PriceChartHistoryPoint[]
): DiscountAnalysis {
  if (!history || history.length < 2) {
    return {
      verdict: 'UNKNOWN',
      verdict_label: 'تاریخچه ناکافی',
      verdict_color: 'gray',
      score: 50,
      reason: 'داده‌های تاریخچه قیمت برای این کالا در دسترس نیست یا کمتر از ۲ روز است.',
      min_30d: sellingPrice,
      max_30d: rrpPrice,
      avg_30d: sellingPrice,
      price_diff_30d_min: 0,
      price_diff_percent: 0,
      is_all_time_low: false,
      rrp_inflated: false,
    };
  }

  const validPoints = history.filter(p => p.selling_price && p.selling_price > 0);
  const points = validPoints.length > 0 ? validPoints : history;

  const recent30 = points.slice(-30);
  const recentSelling = recent30.map(p => p.selling_price);

  const min30d = Math.min(...recentSelling);
  const max30d = Math.max(...recentSelling);
  const avg30d = Math.round(recentSelling.reduce((a, b) => a + b, 0) / recentSelling.length);
  const allTimeMin = Math.min(...points.map(p => p.selling_price));

  const prevPoint = points.length >= 2 ? points[points.length - 2] : points[points.length - 1];
  const prevSelling = prevPoint.selling_price;
  const prevRrp = prevPoint.rrp_price || prevSelling;

  const isAllTimeLow = sellingPrice <= allTimeMin;
  const is30dLow = sellingPrice <= min30d;

  let rrpInflated = false;
  if (prevRrp > 0 && rrpPrice > prevRrp * 1.15 && sellingPrice >= prevSelling * 0.98) {
    rrpInflated = true;
  }

  const diffFromMin = sellingPrice - min30d;
  const diffFromPrev = sellingPrice - prevSelling;

  let verdict: DiscountVerdict = 'NEUTRAL';
  let verdictLabel = 'تخفیف جزئی';
  let verdictColor: DiscountAnalysis['verdict_color'] = 'blue';
  let score = 50;
  let reason = 'قیمت کالا تفاوت محسوسی با نوسانات عادی روزهای گذشته ندارد.';

  if (rrpInflated) {
    verdict = 'FAKE_INFLATED';
    verdictLabel = 'تخفیف کاذب (باد کردن قیمت پایه)';
    verdictColor = 'red';
    score = 15;
    reason = `قیمت خط‌خورده به صورت صوری از ${prevRrp.toLocaleString('fa-IR')} به ${rrpPrice.toLocaleString('fa-IR')} ریال بالا برده شده تا درصد تخفیف زیاد نشان داده شود؛ قیمت فروش واقعی ارزان نشده است.`;
  } else if (diffFromPrev > 0 && sellingPrice > prevSelling * 1.03) {
    verdict = 'FAKE_MORE_EXPENSIVE';
    verdictLabel = 'تخفیف الکی (گران‌تر از دیروز!)';
    verdictColor = 'red';
    score = 10;
    reason = `قیمت این کالا در شگفت‌انگیز حتی از قیمت روز قبل (${prevSelling.toLocaleString('fa-IR')} ریال) گران‌تر است!`;
  } else if (Math.abs(diffFromPrev) < prevSelling * 0.01 && sellingPrice >= avg30d * 0.98) {
    verdict = 'FAKE_UNCHANGED';
    verdictLabel = 'تخفیف صوری (بدون تغییر قیمت)';
    verdictColor = 'orange';
    score = 30;
    reason = `این کالا در روزهای گذشته نیز با همین قیمت (${prevSelling.toLocaleString('fa-IR')} ریال) به فروش می‌رسیده و تخفیف جدیدی ندارد.`;
  } else if (is30dLow || isAllTimeLow) {
    verdict = 'REAL_GREAT';
    verdictLabel = 'تخفیف ۱۰۰٪ واقعی (کف قیمت ماه)';
    verdictColor = 'green';
    score = isAllTimeLow ? 95 : 88;
    reason = `قیمت فعلی (${sellingPrice.toLocaleString('fa-IR')} ریال) ارزان‌ترین قیمت ثبت‌شده در ۳۰ روز اخیر برای این کالا است.`;
  } else if (sellingPrice < avg30d && sellingPrice < prevSelling) {
    verdict = 'REAL_MODERATE';
    verdictLabel = 'تخفیف واقعی و منصفانه';
    verdictColor = 'emerald';
    score = 75;
    const savePct = Math.round((1 - sellingPrice / avg30d) * 100);
    reason = `قیمت فعلی حدود ${savePct.toLocaleString('fa-IR')}٪ ارزان‌تر از میانگین قیمت یک ماه گذشته کالا است.`;
  }

  return {
    verdict,
    verdict_label: verdictLabel,
    verdict_color: verdictColor,
    score,
    reason,
    min_30d: min30d,
    max_30d: max30d,
    avg_30d: avg30d,
    price_diff_30d_min: diffFromMin,
    price_diff_percent: prevSelling ? Math.round((diffFromPrev / prevSelling) * 100) : 0,
    is_all_time_low: isAllTimeLow,
    rrp_inflated: rrpInflated,
    prev_selling: prevSelling,
    prev_rrp: prevRrp,
  };
}
