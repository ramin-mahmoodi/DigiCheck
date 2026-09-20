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
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
} from 'lucide-react';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { CategoryTabs } from './components/CategoryTabs';
import { MainCategoryBar } from './components/MainCategoryBar';
import { ProductCard } from './components/ProductCard';
import { PriceChartModal } from './components/PriceChartModal';
import { ManualChecker } from './components/ManualChecker';
import { ProxySettingsModal } from './components/ProxySettingsModal';
import { fetchOffersData, fetchLiveOffers } from './services/api';
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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 50;

  // Modal States
  const [selectedProductForChart, setSelectedProductForChart] = useState<ProductItem | null>(null);
  const [isManualCheckerOpen, setIsManualCheckerOpen] = useState(false);
  const [isProxyModalOpen, setIsProxyModalOpen] = useState(false);

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      // 1. First attempt live fetch of current incredible offers via proxy
      const liveOffers = await fetchLiveOffers();
      setData(liveOffers);
    } catch (err: any) {
      console.warn('[DigiCheck] Live offers fetch failed, falling back to static offers cache:', err);
      // 2. Fallback to static offers data
      try {
        const response = await fetchOffersData();
        setData(response);
      } catch (fallbackErr: any) {
        setError(fallbackErr.message || 'خطا در دریافت اطلاعات شگفت‌انگیز دیجی‌کالا');
      }
    } finally {
      setIsRefreshing(false);
    }
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

  // Compute category offer counts matching Digikala's main categories
  const productCategoryCounts = useMemo(() => {
    if (!currentProducts) return {};
    const counts: Record<string, number> = {};
    for (const p of currentProducts) {
      const cat = p.category_title || 'سایر';
      counts[cat] = (counts[cat] || 0) + 1;
      if (p.category_id) {
        counts[String(p.category_id)] = (counts[String(p.category_id)] || 0) + 1;
      }
      if (cat === 'کالای دیجیتال' && (p.title_fa.includes('گوشی') || p.title_fa.includes('موبایل'))) {
        counts['موبایل'] = (counts['موبایل'] || 0) + 1;
      }
    }
    return counts;
  }, [currentProducts]);

  // Filter and sort products of the active category
  const filteredProducts = useMemo(() => {
    if (!currentProducts || currentProducts.length === 0) {
      return [];
    }

    let list = [...currentProducts];

    // 1. Topic Category filter
    if (selectedCategory !== null) {
      list = list.filter((p) => {
        const cat = p.category_title || 'سایر';
        if (selectedCategory === 'موبایل') {
          return cat === 'موبایل' || p.category_id === 1 || p.title_fa.includes('گوشی') || p.title_fa.includes('موبایل');
        }
        if (selectedCategory === 'اسباب بازی') {
          return cat === 'اسباب بازی' || p.category_id === 6027 || p.title_fa.includes('اسباب بازی') || p.title_fa.includes('لگو');
        }
        if (selectedCategory === 'کالاهای سوپرمارکتی' || selectedCategory === 'سوپرمارکت') {
          return cat === 'کالاهای سوپرمارکتی' || cat === 'سوپرمارکت';
        }
        return cat === selectedCategory;
      });
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

  // Reset pagination to page 1 whenever any filter or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedCategory, verdictFilter, searchQuery, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 transition-colors">
      {/* Header */}
      <Header
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenManualChecker={() => setIsManualCheckerOpen(true)}
        onOpenProxySettings={() => setIsProxyModalOpen(true)}
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

            {/* Main Category Filter (Digikala Visual Style with Drag & Floating Arrows) */}
            {data.main_categories && data.main_categories.length > 0 && (
              <MainCategoryBar
                categories={data.main_categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                productCategoryCounts={productCategoryCounts}
                totalProductsCount={currentProducts.length}
              />
            )}

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
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 my-6">
                  {paginatedProducts.map((product) => (
                    <ProductCard
                      key={`${product.offer_type}-${product.id}`}
                      product={product}
                      onOpenChart={(prod) => setSelectedProductForChart(prod)}
                    />
                  ))}
                </div>

                {/* Pagination Controls (50 items per page) */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 my-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      نمایش {((currentPage - 1) * ITEMS_PER_PAGE + 1).toLocaleString('fa-IR')} تا{' '}
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length).toLocaleString('fa-IR')} از{' '}
                      {filteredProducts.length.toLocaleString('fa-IR')} کالا (صفحه {currentPage.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')})
                    </div>

                    <div className="flex items-center gap-1.5" dir="rtl">
                      {/* First Page */}
                      <button
                        onClick={() => {
                          setCurrentPage(1);
                          window.scrollTo({ top: 380, behavior: 'smooth' });
                        }}
                        disabled={currentPage === 1}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        title="صفحه اول"
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </button>

                      {/* Prev Page */}
                      <button
                        onClick={() => {
                          setCurrentPage((prev) => Math.max(1, prev - 1));
                          window.scrollTo({ top: 380, behavior: 'smooth' });
                        }}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                        <span className="hidden sm:inline">قبلی</span>
                      </button>

                      {/* Page Numbers */}
                      <div className="flex items-center gap-1 mx-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((p) => {
                            return (
                              p === 1 ||
                              p === totalPages ||
                              (p >= currentPage - 2 && p <= currentPage + 2)
                            );
                          })
                          .map((p, idx, arr) => {
                            const prev = arr[idx - 1];
                            return (
                              <React.Fragment key={p}>
                                {prev && p - prev > 1 && (
                                  <span className="px-1 text-slate-400 text-xs select-none">...</span>
                                )}
                                <button
                                  onClick={() => {
                                    setCurrentPage(p);
                                    window.scrollTo({ top: 380, behavior: 'smooth' });
                                  }}
                                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                                    currentPage === p
                                      ? 'bg-red-600 text-white shadow-md shadow-red-500/20 scale-105'
                                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {p.toLocaleString('fa-IR')}
                                </button>
                              </React.Fragment>
                            );
                          })}
                      </div>

                      {/* Next Page */}
                      <button
                        onClick={() => {
                          setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                          window.scrollTo({ top: 380, behavior: 'smooth' });
                        }}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <span className="hidden sm:inline">بعدی</span>
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {/* Last Page */}
                      <button
                        onClick={() => {
                          setCurrentPage(totalPages);
                          window.scrollTo({ top: 380, behavior: 'smooth' });
                        }}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        title="صفحه آخر"
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
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

      <ProxySettingsModal
        isOpen={isProxyModalOpen}
        onClose={() => setIsProxyModalOpen(false)}
      />
    </div>
  );
};
