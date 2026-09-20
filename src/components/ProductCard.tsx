import React from 'react';
import { ExternalLink, CheckCircle2, XCircle, AlertTriangle, TrendingDown } from 'lucide-react';
import { ProductItem } from '../types';

interface ProductCardProps {
  product: ProductItem;
  onOpenChart: (product: ProductItem) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenChart }) => {
  const sellingPriceToman = Math.round(product.selling_price / 10);
  const rrpPriceToman = Math.round(product.rrp_price / 10);

  const analysis = product.analysis;

  // Render Verdict Badge
  const renderVerdictBadge = () => {
    if (!analysis) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
          <span>شگفت‌انگیز رسمی</span>
        </span>
      );
    }

    switch (analysis.verdict) {
      case 'REAL_GREAT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>تخفیف واقعی (کف قیمت)</span>
          </span>
        );
      case 'REAL_MODERATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-300 dark:border-teal-800">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>تخفیف منصفانه</span>
          </span>
        );
      case 'FAKE_INFLATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5" />
            <span>تخفیف صوری (قیمت بادشده)</span>
          </span>
        );
      case 'FAKE_UNCHANGED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>تخفیف الکی (قیمت ثابت)</span>
          </span>
        );
      case 'FAKE_MORE_EXPENSIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5" />
            <span>گران‌تر از دیروز!</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
            <span>تخفیف جزئی</span>
          </span>
        );
    }
  };

  return (
    <div
      onClick={() => onOpenChart(product)}
      className="group flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-900/60 hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer"
    >
      {/* Top Image & Badges */}
      <div className="relative aspect-square w-full bg-white p-4 flex items-center justify-center border-b border-slate-100 dark:border-slate-800/60">
        {product.image ? (
          <img
            src={product.image}
            alt={product.title_fa}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs">
            بدون تصویر
          </div>
        )}

        {/* Discount Badge */}
        {product.discount_percent > 0 && (
          <div className="absolute top-3 right-3 bg-red-600 text-white font-black text-xs px-2 py-1 rounded-lg shadow-md">
            {product.discount_percent.toLocaleString('fa-IR')}٪
          </div>
        )}

        {/* External Link */}
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 left-3 p-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors shadow-sm"
          title="مشاهده در دیجی‌کالا"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-4">
        {/* Verdict Badge */}
        <div className="mb-2.5 flex items-center justify-between">
          {renderVerdictBadge()}
          {analysis && (
            <span className="text-[11px] font-bold text-slate-400">
              امتیاز: {analysis.score.toLocaleString('fa-IR')}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed mb-3">
          {product.title_fa}
        </h3>

        {/* Pricing Info */}
        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-medium">قیمت شگفت‌انگیز:</span>
            <div className="flex items-baseline gap-1">
              <span className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                {sellingPriceToman.toLocaleString('fa-IR')}
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">تومان</span>
            </div>
          </div>

          {rrpPriceToman > sellingPriceToman && (
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>قیمت خط‌خورده:</span>
              <span className="line-through">{rrpPriceToman.toLocaleString('fa-IR')} تومان</span>
            </div>
          )}

          {/* Analysis Snippet */}
          {analysis && analysis.reason && (
            <div className="text-[11px] p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
              {analysis.reason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
