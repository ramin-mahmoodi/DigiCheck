import React from 'react';
import { Sparkles, Zap, Calendar, Clock, ShoppingBag, Eye, Flame } from 'lucide-react';
import { OfferCategory } from '../types';

interface CategoryTabsProps {
  categories: Record<string, OfferCategory>;
  activeTab: string;
  onSelectTab: (tabKey: string) => void;
  totalUniqueCount: number;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Sparkles,
  Zap,
  Calendar,
  Clock,
  ShoppingBag,
  Eye,
};

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  activeTab,
  onSelectTab,
  totalUniqueCount,
}) => {
  const categoryList = Object.values(categories);

  return (
    <div className="w-full border-b border-slate-200 dark:border-slate-800 my-4 overflow-hidden">
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-3 pt-1 px-1">
        {/* All Incredible Offers Combined Option */}
        <button
          onClick={() => onSelectTab('ALL_OFFERS')}
          className={`flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all select-none ${
            activeTab === 'ALL_OFFERS'
              ? 'bg-red-600 text-white shadow-md shadow-red-500/20 font-bold scale-[1.02]'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Flame className={`w-4 h-4 shrink-0 ${activeTab === 'ALL_OFFERS' ? 'text-white' : 'text-amber-500'}`} />
          <span className="shrink-0">همه شگفت‌انگیزها</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${
              activeTab === 'ALL_OFFERS'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            {totalUniqueCount.toLocaleString('fa-IR')}
          </span>
        </button>

        {/* Individual Offer Buckets from Digikala API */}
        {categoryList.map((cat) => {
          const isActive = activeTab === cat.key;
          const Icon = ICON_MAP[cat.icon] || Sparkles;

          return (
            <button
              key={cat.key}
              onClick={() => onSelectTab(cat.key)}
              className={`flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all select-none ${
                isActive
                  ? 'bg-red-600 text-white shadow-md shadow-red-500/20 font-bold scale-[1.02]'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-red-500'}`} />
              <span className="shrink-0">{cat.title}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {cat.count.toLocaleString('fa-IR')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
