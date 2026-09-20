import React, { useState } from 'react';
import { X, Search, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';
import { extractProductId, fetchLiveProductChart } from '../services/api';
import { ProductChartData, ProductItem } from '../types';

interface ManualCheckerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChartWithData: (product: ProductItem) => void;
}

export const ManualChecker: React.FC<ManualCheckerProps> = ({
  isOpen,
  onClose,
  onOpenChartWithData,
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const productId = extractProductId(input);
    if (!productId) {
      setError('لطفاً یک لینک معتبر دیجی‌کالا یا یک کد کالای عددی (مثل 4545846) وارد کنید.');
      return;
    }

    setLoading(true);
    try {
      const data: ProductChartData = await fetchLiveProductChart(productId);
      // Map to ProductItem format so the existing modal can display it
      const tempProduct: ProductItem = {
        id: data.product_id,
        title_fa: data.title,
        title_en: '',
        image: '',
        selling_price: data.selling_price,
        rrp_price: data.rrp_price,
        discount_percent: data.rrp_price > data.selling_price ? Math.round((1 - data.selling_price / data.rrp_price) * 100) : 0,
        rating: 0,
        rating_count: 0,
        category_id: null,
        url: `https://www.digikala.com/product/dkp-${data.product_id}/`,
        offer_type: 'manual',
        offer_type_title: 'استعلام دستی',
        has_chart: true,
        analysis: data.analysis,
      };

      onClose();
      onOpenChartWithData(tempProduct);
    } catch (err: any) {
      setError(err.message || 'خطا در دریافت اطلاعات چارت قیمت دیجی‌کالا');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-red-500" />
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              استعلام و اعتبارسنجی هر کالای دیجی‌کالا
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 my-4 leading-relaxed">
          می‌توانید لینک کالا در دیجی‌کالا (مانند <code className="text-red-500 font-mono">https://www.digikala.com/product/dkp-4545846/</code>) یا فقط کد عددی محصول (<code className="text-red-500 font-mono">4545846</code>) را وارد کنید تا چارت و وضعیت واقعی یا الکی بودن تخفیف آن فوراً بررسی شود.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              لینک محصول یا کد dkp:
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="مثال: https://www.digikala.com/product/dkp-4545846/ یا 4545846"
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-mono placeholder:font-vazir"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-md shadow-red-600/20"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>در حال بررسی چارت...</span>
                </>
              ) : (
                <>
                  <span>بررسی تخفیف کالا</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
