import React, { useEffect, useState } from 'react';
import {
  X,
  LineChart as ChartIcon,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingDown,
  Info,
  Calendar,
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
import { fetchCachedProductChart } from '../services/api';

interface PriceChartModalProps {
  product: ProductItem | null;
  onClose: () => void;
}

export const PriceChartModal: React.FC<PriceChartModalProps> = ({ product, onClose }) => {
  const [chartData, setChartData] = useState<ProductChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!product) {
      setChartData(null);
      return;
    }

    const loadChart = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCachedProductChart(product.id);
        if (data) {
          setChartData(data);
        } else {
          setError('تاریخچه قیمت برای این کالا هنوز کش نشده است.');
        }
      } catch (err: any) {
        setError(err.message || 'خطا در بارگذاری چارت');
      } finally {
        setLoading(false);
      }
    };

    loadChart();
  }, [product]);

  if (!product) return null;

  // Format chart data for Recharts (convert to Tomans for human readability)
  const history = chartData?.history || [];
  const formattedPoints = history.map((item: PriceChartHistoryPoint) => ({
    day: item.day,
    selling: Math.round(item.selling_price / 10),
    rrp: Math.round((item.rrp_price || item.selling_price) / 10),
    seller: item.seller || 'نامشخص',
    warranty: item.product_warranty || '',
  }));

  const analysis = chartData?.analysis || product.analysis;
  const currentSellingToman = Math.round(product.selling_price / 10);
  const min30dToman = analysis?.min_30d ? Math.round(analysis.min_30d / 10) : null;
  const avg30dToman = analysis?.avg_30d ? Math.round(analysis.avg_30d / 10) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3.5 pr-1">
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 shrink-0">
              <ChartIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                  کد کالا: {product.id}
                </span>
                {analysis?.verdict && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    امتیاز صداقت: {analysis.score} از ۱۰۰
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1 line-clamp-2">
                {product.title_fa}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Analysis Verdict Banner */}
          {analysis && (
            <div
              className={`p-4 rounded-2xl border ${
                analysis.verdict.startsWith('REAL')
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                  : analysis.verdict.startsWith('FAKE')
                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
                  : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
              }`}
            >
              <div className="flex items-start gap-3">
                {analysis.verdict === 'REAL_GREAT' && (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                )}
                {analysis.verdict === 'REAL_MODERATE' && (
                  <TrendingDown className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" />
                )}
                {analysis.verdict.startsWith('FAKE') && (
                  <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                )}
                {analysis.verdict === 'NEUTRAL' && (
                  <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                )}

                <div className="flex-1">
                  <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                    نتیجه بررسی: {analysis.verdict_label}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                    {analysis.reason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-right">
              <span className="text-xs text-slate-400 font-medium">قیمت شگفت‌انگیز فعلی:</span>
              <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                {currentSellingToman.toLocaleString('fa-IR')}
                <span className="text-xs font-normal text-slate-400 mr-1">تومان</span>
              </div>
            </div>

            {min30dToman && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-right">
                <span className="text-xs text-slate-400 font-medium">کف قیمت ۳۰ روز اخیر:</span>
                <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {min30dToman.toLocaleString('fa-IR')}
                  <span className="text-xs font-normal text-slate-400 mr-1">تومان</span>
                </div>
              </div>
            )}

            {avg30dToman && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-right">
                <span className="text-xs text-slate-400 font-medium">میانگین ۳۰ روزه:</span>
                <div className="text-base font-black text-slate-700 dark:text-slate-300 mt-1">
                  {avg30dToman.toLocaleString('fa-IR')}
                  <span className="text-xs font-normal text-slate-400 mr-1">تومان</span>
                </div>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-right">
              <span className="text-xs text-slate-400 font-medium">درصد تخفیف رسمی:</span>
              <div className="text-base font-black text-red-600 dark:text-red-400 mt-1">
                {product.discount_percent.toLocaleString('fa-IR')}٪
              </div>
            </div>
          </div>

          {/* Interactive Chart */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  روند تغییرات قیمت فروش و خط‌خورده در روزهای گذشته
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                  <span className="text-slate-500">قیمت فروش واقعی</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-red-400"></span>
                  <span className="text-slate-500">قیمت خط‌خورده (RRP)</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center text-sm text-slate-400">
                در حال بارگذاری چارت قیمت...
              </div>
            ) : error ? (
              <div className="h-64 flex items-center justify-center text-sm text-rose-500">
                {error}
              </div>
            ) : formattedPoints.length > 0 ? (
              <div className="h-72 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedPoints} margin={{ top: 10, right: 15, left: 15, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 10, fill: '#888' }}
                      angle={-35}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#888' }}
                      tickFormatter={(val) => `${(val / 1000).toLocaleString()}k`}
                      width={55}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 text-right font-vazir">
                              <div className="font-bold text-slate-700 dark:text-slate-300 border-b pb-1">
                                تاریخ: {label}
                              </div>
                              <div className="text-blue-600 dark:text-blue-400 font-bold">
                                قیمت فروش: {data.selling.toLocaleString('fa-IR')} تومان
                              </div>
                              <div className="text-red-500 line-through">
                                قیمت مصوب: {data.rrp.toLocaleString('fa-IR')} تومان
                              </div>
                              {data.seller && (
                                <div className="text-slate-400 pt-1 text-[11px]">
                                  فروشنده: {data.seller}
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
                        label={{ value: 'کف ۳۰ روز', fill: '#10b981', fontSize: 10, position: 'insideTopLeft' }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="selling"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5 }}
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
              <div className="h-64 flex items-center justify-center text-sm text-slate-400">
                تاریخچه‌ای برای نمایش در چارت موجود نیست.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            تعداد رکوردهای ثبت‌شده در چارت: {formattedPoints.length.toLocaleString('fa-IR')} روز
          </div>
          <div className="flex items-center gap-2">
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-md shadow-red-600/20"
            >
              <span>مشاهده در دیجی‌کالا</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
