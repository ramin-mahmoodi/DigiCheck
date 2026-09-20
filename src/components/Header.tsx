import React from 'react';
import { Sun, Moon, Search, Sparkles, RefreshCw, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenManualChecker: () => void;
  lastUpdatedFa: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  onToggleDarkMode,
  onOpenManualChecker,
  lastUpdatedFa,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-red-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight">
                  دیجی‌چک (DigiCheck)
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                اعتبارسنجی تخفیف‌های شگفت‌انگیز با تحلیل دقیق تاریخچه قیمت
              </p>
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Last updated indicator */}
            {lastUpdatedFa && (
              <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>به‌روزرسانی: {lastUpdatedFa}</span>
              </div>
            )}

            {/* Manual Checker Button */}
            <button
              onClick={onOpenManualChecker}
              className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900/50 transition-colors shadow-sm"
              title="بررسی دستی هر کالا"
            >
              <Search className="w-4 h-4" />
              <span className="hidden xs:inline">استعلام کالا با لینک</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              title="به‌روزرسانی داده‌ها"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-red-500' : ''}`} />
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={darkMode ? 'حالت روز' : 'حالت شب'}
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
