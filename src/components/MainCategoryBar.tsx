import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MainCategory } from '../types';
import { useDragScroll } from '../hooks/useDragScroll';

interface MainCategoryBarProps {
  categories: MainCategory[];
  selectedCategory: string | null;
  onSelectCategory: (categoryTitle: string | null) => void;
  productCategoryCounts: Record<string, number>;
  totalProductsCount: number;
}

export const MainCategoryBar: React.FC<MainCategoryBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  productCategoryCounts,
  totalProductsCount,
}) => {
  const {
    scrollRef,
    isDragging,
    dragMoved,
    canScrollLeft,
    canScrollRight,
    onMouseDown,
    scrollBy,
  } = useDragScroll();

  const handleItemClick = (title: string | null) => {
    // If the mouse was dragged across items, ignore the click
    if (dragMoved) return;
    onSelectCategory(title === selectedCategory ? null : title);
  };

  // Find the 'All' category item or use Digikala's standard red bag
  const allCategoryItem = categories.find((c) => c.id === null) || {
    id: null,
    title: 'همه دسته‌بندی‌ها',
    image: 'https://dkstatics-public.digikala.com/digikala-static/ca295514617381312953d0dd1176a4e67b66a337_1683024994.png',
  };

  const specificCategories = categories.filter((c) => c.id !== null);

  return (
    <div className="relative w-full my-5 py-2 select-none group/catbar">
      {/* Floating Left Arrow Button (ChevronLeft <) */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            scrollBy(-300);
          }}
          className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all opacity-95 hover:opacity-100"
          title="اسکرول به چپ"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
      )}

      {/* Floating Right Arrow Button (ChevronRight >) */}
      {canScrollRight && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            scrollBy(300);
          }}
          className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all opacity-95 hover:opacity-100"
          title="اسکرول به راست"
        >
          <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
      )}

      {/* Draggable Category Container - No visible scrollbar, purely draggable! */}
      <div
        ref={scrollRef}
        onMouseDown={onMouseDown}
        className={`flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar px-3 sm:px-6 py-2 select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* 1. All Categories Card (همه دسته‌بندی‌ها) */}
        <div
          onClick={() => handleItemClick(null)}
          className={`flex shrink-0 flex-col items-center justify-center p-2 sm:p-3 rounded-2xl transition-all cursor-pointer w-22 sm:w-26 h-28 sm:h-32 border ${
            selectedCategory === null
              ? 'bg-red-50/90 dark:bg-red-950/40 border-red-500 shadow-md shadow-red-500/10 scale-102'
              : 'bg-[#f0f0f1] dark:bg-slate-800/80 border-transparent hover:bg-slate-200/70 dark:hover:bg-slate-700/70'
          }`}
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center">
            <img
              src={allCategoryItem.image}
              alt="همه دسته‌بندی‌ها"
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain pointer-events-none drop-shadow-sm"
              draggable={false}
            />
          </div>
          <span
            className={`text-[11px] sm:text-xs font-bold text-center mt-2 leading-tight ${
              selectedCategory === null
                ? 'text-red-600 dark:text-red-400'
                : 'text-slate-800 dark:text-slate-200'
            }`}
          >
            همه دسته‌بندی‌ها
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {totalProductsCount.toLocaleString('fa-IR')} کالا
          </span>
        </div>

        {/* 2. Circular Specific Categories (Identical to Digikala) */}
        {specificCategories.map((cat) => {
          const isSelected = selectedCategory === cat.title;
          const count = productCategoryCounts[cat.title] || 0;

          return (
            <div
              key={cat.id || cat.title}
              onClick={() => handleItemClick(cat.title)}
              className="flex shrink-0 flex-col items-center gap-2 cursor-pointer transition-all group w-20 sm:w-24 text-center select-none"
            >
              {/* Circle Avatar */}
              <div
                className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all ${
                  isSelected
                    ? 'ring-3 ring-red-500 bg-red-50 dark:bg-red-950/50 shadow-lg shadow-red-500/25 scale-105'
                    : 'bg-[#f0f0f1] dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 group-hover:scale-105 group-hover:shadow-sm'
                }`}
              >
                <img
                  src={cat.image}
                  alt={cat.title}
                  className="w-13 h-13 sm:w-16 sm:h-16 object-contain pointer-events-none group-hover:scale-110 transition-transform duration-300 drop-shadow-sm"
                  draggable={false}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />

                {/* Offer count badge if available */}
                {count > 0 && (
                  <span
                    className={`absolute -bottom-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-white dark:border-slate-900 ${
                      isSelected
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                    }`}
                  >
                    {count.toLocaleString('fa-IR')}
                  </span>
                )}
              </div>

              {/* Title under circle */}
              <span
                className={`text-[11px] sm:text-xs text-center line-clamp-2 max-w-[80px] sm:max-w-[90px] leading-snug transition-colors ${
                  isSelected
                    ? 'font-bold text-red-600 dark:text-red-400'
                    : count > 0
                    ? 'font-semibold text-slate-800 dark:text-slate-200 group-hover:text-red-600 dark:group-hover:text-red-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {cat.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
