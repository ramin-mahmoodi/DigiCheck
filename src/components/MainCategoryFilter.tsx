import React from 'react';

export interface CategorySummaryItem {
  title: string;
  count: number;
}

interface MainCategoryFilterProps {
  categories: CategorySummaryItem[];
  selectedCategory: string | null;
  onSelectCategory: (categoryTitle: string | null) => void;
  totalCount: number;
}

export const MainCategoryFilter: React.FC<MainCategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  totalCount,
}) => {
  if (categories.length === 0) return null;

  return (
    <div className="w-full my-3 overflow-hidden">
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-2 px-1">
        {/* All Categories Button */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`flex shrink-0 items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all select-none ${
            selectedCategory === null
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <span>همه دسته‌ها</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              selectedCategory === null
                ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}
          >
            {totalCount.toLocaleString('fa-IR')}
          </span>
        </button>

        {/* Specific Category Buttons */}
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.title;

          return (
            <button
              key={cat.title}
              onClick={() => onSelectCategory(isSelected ? null : cat.title)}
              className={`flex shrink-0 items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all select-none ${
                isSelected
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-sm ring-2 ring-slate-400'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <span>{cat.title}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isSelected
                    ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
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
