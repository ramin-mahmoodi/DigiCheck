import React from 'react';
import { MainCategory } from '../types';

interface MainCategoryFilterProps {
  categories: MainCategory[];
  selectedCategoryId: number | null;
  onSelectCategory: (id: number | null) => void;
}

export const MainCategoryFilter: React.FC<MainCategoryFilterProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2 my-2 no-scrollbar">
      <button
        onClick={() => onSelectCategory(null)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
          selectedCategoryId === null
            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
        }`}
      >
        همه دسته‌ها
      </button>

      {categories
        .filter((cat) => cat.id !== null)
        .map((cat) => {
          const isSelected = selectedCategoryId === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                isSelected
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {cat.image && (
                <img
                  src={cat.image}
                  alt={cat.title}
                  className="w-4 h-4 object-contain rounded-full"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}
              <span>{cat.title}</span>
            </button>
          );
        })}
    </div>
  );
};
