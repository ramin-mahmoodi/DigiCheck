import React, { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Github,
  Heart,
  Layers,
} from 'lucide-react';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { CategoryTabs } from './components/CategoryTabs';
import { MainCategoryFilter } from './components/MainCategoryFilter';
import { ProductCard } from './components/ProductCard';
import { PriceChartModal } from './components/PriceChartModal';
import { ManualChecker } from './components/ManualChecker';
import { fetchOffersData } from './services/api';
import { OffersDataResponse, ProductItem } from './types';

export const App: React.FC = () => {
  // Theme State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return (
      localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Data States
  const [data, setData] = useState<OffersDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter States
  const [activeTab, setActiveTab] = useState<string>('ALL_OFFERS');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [verdictFilter, setVerdictFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'default' | 'score_desc' | 'discount_desc' | 'price_asc' | 'price_desc'>('default');

  // Modal States
  const [selectedProductForChart, setSelectedProductForChart] = useState<ProductItem | null>(null);
  const [isManualCheckerOpen, setIsManualCheckerOpen] = useState(false);

  // Fetch initial data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchOffersData();
      setData(response);
    } catch (err: any) {
      setError(err.message || 'خطا در دریافت اطلاعات شگفت‌انگیز دیجی‌کالا');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  // Products for currently active offer tab (or all unique products if ALL_OFFERS)
  const currentProducts = useMemo(() => {
    if (!data) return [];
    if (activeTab === 'ALL_OFFERS') {
      const map = new Map<number, ProductItem>();
      for (const cat of Object.values(data.offer_categories)) {
        for (const p of cat.products) {
          if (!map.has(p.id)) {
            map.set(p.id, p);
          }
        }
      }
      return Array.from(map.values());
    }
    return data.offer_categories[activeTab]?.products || [];
  }, [data, activeTab]);

  // Compute available categories dynamically for current offer tab
  const availableCategories = useMemo(() => {
    if (!currentProducts || currentProducts.length === 0) return [];
    const counts: Record<string, number> = {};
    for (const p of currentProducts) {
      const cat = p.category_title || 'سایر';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count);
  }, [currentProducts]);

  // Filter and sort products of the active category
  const filteredProducts = useMemo(() => {
    if (!currentProducts || currentProducts.length === 0) {
      return [];
    }

    let list = [...currentProducts];

    // 1. Topic Category filter
    if (selectedCategory !== null) {
      list = list.filter((p) => (p.category_title || 'سایر') === selectedCategory);
    }

    // 2. Verdict filter (Real vs Fake vs All)
    if (verdictFilter === 'REAL_GREAT') {
      list = list.filter((p) => p.analysis?.verdict === 'REAL_GREAT');
    } else if (verdictFilter === 'REAL_MODERATE') {
      list = list.filter((p) => p.analysis?.verdict === 'REAL_MODERATE');
    } else if (verdictFilter === 'FAKE') {
      list = list.filter((p) => p.analysis?.verdict.startsWith('FAKE'));
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.title_fa.toLowerCase().includes(query) ||
          p.title_en.toLowerCase().includes(query) ||
          String(p.id).includes(query)
      );
    }

    // 4. Sorting
    switch (sortBy) {
      case 'score_desc':
        list.sort((a, b) => (b.analysis?.score || 0) - (a.analysis?.score || 0));
        break;
      case 'discount_desc':
        list.sort((a, b) => b.discount_percent - a.discount_percent);
        break;
      case 'price_asc':
        list.sort((a, b) => a.selling_price - b.selling_price);
        break;
      case 'price_desc':
        list.sort((a, b) => b.selling_price - a.selling_price);
        break;
      default:
        // Keep original Digikala order
        break;
    }

    return list;
  }, [currentProducts, selectedCategory, verdictFilter, searchQuery, sortBy]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Header */}
      <Header
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenManualChecker={() => setIsManualCheckerOpen(true)}
        lastUpdatedFa={data?.last_updated_fa || ''}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Hero Section */}
        <div className="text-center py-6 sm:py-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 mb-3 border border-red-200 dark:border-red-900/50">
            🔥 پایش دقیق و هوشمند تخفیف‌های دیجی‌کالا
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            تخفیف واقعیه یا الکی؟ چارت قیمت رو ببینید!
          </h2>
          <p className="text-xs sm:text-base text-slate-600 dark:text-slate-400 mt-2.5 max-w-2xl mx-auto leading-relaxed">
            این سامانه با بررسی چارت رسمی تغییرات قیمت هر کالا، مشخص می‌کند که آیا تخفیف شگفت‌انگیز
            واقعاً ارزان شده یا قیمت خط‌خورده را صوری باد کرده‌اند!
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
              در حال بارگذاری کالاها و داده‌های تحلیلی...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="my-8 p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-center max-w-lg mx-auto">
            <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">خطا در بارگذاری اطلاعات</h3>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">{error}</p>
            <button
              onClick={loadData}
              className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              تلاش مجدد
            </button>
          </div>
        )}

        {/* Data Loaded Successfully */}
        {data && !loading && (
          <>
            {/* High-level Stats Cards */}
            <StatsBar
              stats={data.stats}
              totalProducts={data.total_products}
              activeFilter={verdictFilter}
              onSelectFilter={(filter) => setVerdictFilter(filter)}
            />

            {/* Offer Categories (Unmerged Tabs) */}
            <CategoryTabs
              categories={data.offer_categories}
              activeTab={activeTab}
              onSelectTab={(tabKey) => {
                setActiveTab(tabKey);
                setSelectedCategory(null); // Reset subcategory when switching offer tab
              }}
              totalUniqueCount={data.total_products}
            />

            {/* Main Category Filter */}
            <MainCategoryFilter
              categories={availableCategories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              totalCount={currentProducts.length}
            />

            {/* Search & Sort Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 my-5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجوی نام کالا یا کد..."
                  className="w-full pr-10 pl-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium shrink-0 flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  مرتب‌سازی:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="default">پیش‌فرض دیجی‌کالا</option>
                  <option value="score_desc">صادقانه‌ترین تخفیف‌ها</option>
                  <option value="discount_desc">بیشترین درصد تخفیف</option>
                  <option value="price_asc">ارزان‌ترین قیمت</option>
                  <option value="price_desc">گران‌ترین قیمت</option>
                </select>
              </div>
            </div>

            {/* Product Cards Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 my-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={`${product.offer_type}-${product.id}`}
                    product={product}
                    onOpenChart={(prod) => setSelectedProductForChart(prod)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 my-6">
                <Layers className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                  هیچ کالایی با فیلترهای انتخابی یافت نشد
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  می‌توانید فیلتر دسته‌بندی یا جستجوی خود را پاک کنید.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setVerdictFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  حذف همه فیلترها
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 py-6 mt-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            توسعه‌داده‌شده برای کمک به خریداران ایرانی جهت شناسایی تخفیف‌های واقعی دیجی‌کالا.
          </div>
          <div className="flex items-center gap-4">
            <span>میزبانی ۱۰۰٪ روی GitHub Pages</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <PriceChartModal
        product={selectedProductForChart}
        onClose={() => setSelectedProductForChart(null)}
      />

      <ManualChecker
        isOpen={isManualCheckerOpen}
        onClose={() => setIsManualCheckerOpen(false)}
        onOpenChartWithData={(prod) => setSelectedProductForChart(prod)}
      />
    </div>
  );
};
