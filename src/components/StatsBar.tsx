import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, TrendingDown, Layers } from 'lucide-react';

interface StatsBarProps {
  stats: Record<string, number>;
  totalProducts: number;
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  stats,
  totalProducts,
  activeFilter,
  onSelectFilter,
}) => {
  const realGreat = stats['REAL_GREAT'] || 0;
  const realModerate = stats['REAL_MODERATE'] || 0;
  const fakeTotal = (stats['FAKE_INFLATED'] || 0) + (stats['FAKE_UNCHANGED'] || 0) + (stats['FAKE_MORE_EXPENSIVE'] || 0);

  const cards = [
    {
      id: 'ALL',
      label: 'کل کالاها',
      count: totalProducts,
      icon: Layers,
      color: 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300',
      activeColor: 'ring-2 ring-slate-400 bg-slate-100 dark:bg-slate-800/80',
    },
    {
      id: 'REAL_GREAT',
      label: 'تخفیف واقعی (کف قیمت)',
      count: realGreat,
      icon: CheckCircle2,
      color: 'border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400',
      activeColor: 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      id: 'REAL_MODERATE',
      label: 'تخفیف منصفانه',
      count: realModerate,
      icon: TrendingDown,
      color: 'border-teal-300 dark:border-teal-800 text-teal-700 dark:text-teal-400',
      activeColor: 'ring-2 ring-teal-500 bg-teal-50 dark:bg-teal-950/40',
    },
    {
      id: 'FAKE',
      label: 'تخفیف الکی / صوری',
      count: fakeTotal,
      icon: XCircle,
      color: 'border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400',
      activeColor: 'ring-2 ring-rose-500 bg-rose-50 dark:bg-rose-950/40',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 my-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.id;

        return (
          <button
            key={card.id}
            onClick={() => onSelectFilter(card.id)}
            className={`flex items-center gap-3 p-3 sm:p-4 rounded-2xl border transition-all text-right ${card.color} ${
              isActive
                ? card.activeColor
                : 'bg-white dark:bg-slate-900 hover:shadow-md hover:border-slate-400 dark:hover:border-slate-600'
            }`}
          >
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                {card.label}
              </div>
              <div className="text-lg sm:text-xl font-black mt-0.5 tracking-tight">
                {card.count.toLocaleString('fa-IR')}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
