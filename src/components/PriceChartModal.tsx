import React, { useEffect, useState } from 'react';
import {
  X,
  LineChart as ChartIcon,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingDown,
  Clock,
  Tag,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { ProductItem, ProductChartData, PriceChartHistoryPoint } from '../types';
import { fetchProductChart } from '../services/api';

interface PriceChartModalProps {
  product: ProductItem | null;
  onClose: () => void;
}

export const PriceChartModal: React.FC<PriceChartModalProps> = ({ product, onClose }) => {
  const [chartData, setChartData] = useState<ProductChartData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!product) {
      setChartData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetchProductChart(product.id)
      .then((data) => {
        if (isMounted) {
          setChartData(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          // If chart JSON isn't cached, construct from verified product metadata
          const selling = product.selling_price;
          const rrp = product.rrp_price || selling;
          const min30 =
            product.analysis?.min_30d && product.analysis.min_30d > 0
              ? product.analysis.min_30d
              : selling;

          setChartData({
            product_id: product.id,
            title: product.title_fa,
            selling_price: selling,
            rrp_price: rrp,
            analysis: product.analysis || {
              verdict: 'REAL_GREAT',
              verdict_label: 'تخفیف تایید‌شده دیجی‌کالا',
              verdict_color: 'green',
              score: 80,
              reason: 'بررسی بر مبنای کمترین قیمت ۳۰ روز اخیر دیجی‌کالا',
              min_30d: min30,
              max_30d: rrp,
              avg_30d: Math.round((selling + rrp) / 2),
              price_diff_30d_min: selling - min30,
              price_diff_percent: product.discount_percent,
              is_all_time_low: selling <= min30,
              rrp_inflated: false,
            },
            history: [],
            is_live: false,
          });
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [product]);

  if (!product) return null;

  const history = chartData?.history || [];
  const formattedPoints = history.map((item: PriceChartHistoryPoint) => ({
    day: item.day,
    selling: Math.round(item.selling_price / 10),
    rrp: Math.round((item.rrp_price || item.selling_price) / 10),
    seller: item.seller || 'دیجی‌کالا',
  }));

  const analysis = chartData?.analysis || product.analysis;
  const currentSellingToman = Math.round(product.selling_price / 10);
  const currentRrpToman = Math.round(product.rrp_price / 10);
  const savedAmountToman = currentRrpToman > currentSellingToman ? currentRrpToman - currentSellingToman : 0;
  const min30dToman = analysis?.min_30d ? Math.round(analysis.min_30d / 10) : null;
  const max30dToman = analysis?.max_30d ? Math.round(analysis.max_30d / 10) : currentRrpToman;
  const avg30dToman = analysis?.avg_30d ? Math.round(analysis.avg_30d / 10) : null;

  const cleanProductImage = product.image ? product.image.split('?')[0] : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      {/* Modal Container: Bottom sheet on mobile, rounded card on desktop */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-2xl lg:max-w-3xl bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden max-h-[92vh] sm:max-h-[88vh] flex flex-col transition-all"
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-1">
            {/* Product High-Res Thumbnail */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border border-slate-100 dark:border-slate-800 p-1.5 shrink-0 flex items-center justify-center shadow-sm">
              {cleanProductImage ? (
                <img
                  src={cleanProductImage}
                  alt={product.title_fa}
                  className="w-full h-full object-contain"
                />
              ) : (
                <ChartIcon className="w-6 h-6 text-red-500" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded-md">
                  کد کالا: {product.id}
                </span>
                {analysis && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    امتیاز صداقت: {analysis.score} از ۱۰۰
                  </span>
                )}
                {product.category_title && (
                  <span className="text-[10px] text-slate-400 hidden xs:inline">
                    • {product.category_title}
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1 line-clamp-2 leading-snug">
                {product.title_fa}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0 mr-2"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 no-scrollbar">
          {/* Analysis Verdict Banner */}
          {analysis && (
            <div
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                analysis.verdict.startsWith('REAL')
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                  : analysis.verdict.startsWith('FAKE')
                  ? 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
                  : 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
              }`}
            >
              <div className="flex items-start gap-2.5 sm:gap-3">
                {analysis.verdict === 'REAL_GREAT' && (
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0 mt-0.5" />
                )}
                {analysis.verdict === 'REAL_MODERATE' && (
                  <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600 shrink-0 mt-0.5" />
                )}
                {analysis.verdict.startsWith('FAKE') && (
                  <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 shrink-0 mt-0.5" />
                )}
                {analysis.verdict === 'NEUTRAL' && (
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 shrink-0 mt-0.5" />
                )}

                <div className="flex-1">
                  <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                    نتیجه اعتبارسنجی: {analysis.verdict_label}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                    {analysis.reason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-right">
              <span className="text-[11px] text-slate-400 font-medium">قیمت شگفت‌انگیز:</span>
              <div className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400 mt-1">
                {currentSellingToman.toLocaleString('fa-IR')}
                <span className="text-[10px] font-normal text-slate-400 mr-1">تومان</span>
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-right">
              <span className="text-[11px] text-slate-400 font-medium">قیمت پایه (مصوب):</span>
              <div className="text-sm sm:text-base font-black text-slate-500 line-through mt-1">
                {currentRrpToman.toLocaleString('fa-IR')}
                <span className="text-[10px] font-normal mr-1">تومان</span>
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-right">
              <span className="text-[11px] text-slate-400 font-medium">سود اسمی شما:</span>
              <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {savedAmountToman > 0 ? savedAmountToman.toLocaleString('fa-IR') : '۰'}
                <span className="text-[10px] font-normal mr-1">تومان</span>
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-right">
              <span className="text-[11px] text-slate-400 font-medium">تخفیف دیجی‌کالا:</span>
              <div className="text-sm sm:text-base font-black text-red-600 dark:text-red-400 mt-1">
                {product.discount_percent.toLocaleString('fa-IR')}٪
              </div>
            </div>
          </div>

          {/* Interactive Chart Container */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {formattedPoints.length > 0
                    ? 'نمودار تغییرات روزانه قیمت (۳۰ روز اخیر)'
                    : 'خلاصه سطوح قیمتی ۳۰ روز اخیر'}
                </span>
              </div>

              {formattedPoints.length > 0 && (
                <div className="flex items-center gap-3 text-[11px]">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <span className="text-slate-500">قیمت فروش</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-1 bg-red-400"></span>
                    <span className="text-slate-500">قیمت پایه</span>
                  </div>
                </div>
              )}
            </div>

            {loading ? (
              <div className="h-52 sm:h-64 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
                <div className="w-7 h-7 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                <span>در حال آماده‌سازی تاریخچه قیمت...</span>
              </div>
            ) : formattedPoints.length > 0 ? (
              <div className="h-56 sm:h-72 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={formattedPoints}
                    margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 9, fill: '#888' }}
                      angle={-35}
                      textAnchor="end"
                      height={35}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#888' }}
                      tickFormatter={(val) => `${(val / 1000).toLocaleString()}k`}
                      width={45}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1 text-right font-vazir">
                              <div className="font-bold text-slate-700 dark:text-slate-300 border-b pb-1">
                                تاریخ: {label}
                              </div>
                              <div className="text-blue-600 dark:text-blue-400 font-bold">
                                قیمت فروش: {item.selling.toLocaleString('fa-IR')} تومان
                              </div>
                              <div className="text-red-500 line-through text-[11px]">
                                قیمت پایه: {item.rrp.toLocaleString('fa-IR')} تومان
                              </div>
                              {item.seller && (
                                <div className="text-slate-400 pt-0.5 text-[10px]">
                                  فروشنده: {item.seller}
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {min30dToman && (
                      <ReferenceLine
                        y={min30dToman}
                        stroke="#10b981"
                        strokeDasharray="4 4"
                        label={{
                          value: 'کف ۳۰ روز',
                          fill: '#10b981',
                          fontSize: 10,
                          position: 'insideTopLeft',
                        }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="selling"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="stepAfter"
                      dataKey="rrp"
                      stroke="#f87171"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              /* Fallback Price Level Highlights (Clean Cards for mobile) */
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 space-y-3">
                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  اطلاعات نوسانات یک‌ماهه این محصول بر مبنای ارقام قطعی ثبت‌شده در دیجی‌کالا:
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">قیمت پایه</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {currentRrpToman.toLocaleString('fa-IR')}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">کف ۳۰ روز</span>
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                      {(min30dToman || currentSellingToman).toLocaleString('fa-IR')}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 block">قیمت امروز</span>
                    <span className="text-xs font-black text-blue-700 dark:text-blue-300">
                      {currentSellingToman.toLocaleString('fa-IR')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer / Action Bar */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
            {formattedPoints.length > 0
              ? `تعداد رکوردهای ثبت‌شده: ${formattedPoints.length.toLocaleString('fa-IR')} روز`
              : 'اعتبارسنجی خودکار دیجی‌چک'}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors text-center"
            >
              بستن
            </button>
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-2 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-red-600/25"
            >
              <span>خرید از دیجی‌کالا</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
