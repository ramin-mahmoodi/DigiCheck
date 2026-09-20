import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  Globe,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Zap,
} from 'lucide-react';
import {
  DEFAULT_PROXIES,
  getStoredProxyUrl,
  setStoredProxyUrl,
  testProxyConnection,
} from '../services/api';

interface ProxySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const ProxySettingsModal: React.FC<ProxySettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    error?: string;
  } | null>(null);
  const [hasCopiedCode, setHasCopiedCode] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredProxyUrl();
      const matched = DEFAULT_PROXIES.find((p) => p.url === stored);
      if (matched) {
        setSelectedPreset(matched.id);
        setCustomUrl('');
      } else {
        setSelectedPreset('custom');
        setCustomUrl(stored);
      }
      setTestResult(null);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentEffectiveUrl =
    selectedPreset === 'custom'
      ? customUrl.trim()
      : DEFAULT_PROXIES.find((p) => p.id === selectedPreset)?.url || '';

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testProxyConnection(currentEffectiveUrl);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        latencyMs: 0,
        error: err.message || 'خطا در ارتباط با سرور پروکسی',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    setStoredProxyUrl(currentEffectiveUrl);
    setSaveSuccess(true);
    if (onSaved) onSaved();
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleReset = () => {
    const defaultUrl = DEFAULT_PROXIES[0].url;
    setSelectedPreset(DEFAULT_PROXIES[0].id);
    setCustomUrl('');
    setStoredProxyUrl(defaultUrl);
    setTestResult(null);
  };

  const workerCode = `export default {
  async fetch(request) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) return new Response('Missing ?url=', { status: 400, headers: corsHeaders });

    try {
      const pidMatch = targetUrl.match(/\\/product\\/(\\d+)\\//);
      const referer = pidMatch ? \`https://www.digikala.com/product/dkp-\${pidMatch[1]}/\` : 'https://www.digikala.com/';

      let currentUrl = targetUrl;
      const cookieMap = new Map();
      let response;
      let hops = 0;

      while (hops < 6) {
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': referer,
          'Accept-Language': 'fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7',
        };

        if (cookieMap.size > 0) {
          headers['Cookie'] = Array.from(cookieMap.entries()).map(([k, v]) => \`\${k}=\${v}\`).join('; '));
        }

        response = await fetch(currentUrl, { method: 'GET', headers, redirect: 'manual' });

        const rawCookies = [];
        if (response.headers.getSetCookie) {
          try { rawCookies.push(...response.headers.getSetCookie()); } catch (e) {}
        }
        const singleSetCookie = response.headers.get('set-cookie');
        if (singleSetCookie) rawCookies.push(singleSetCookie);

        const cookieRegex = /(?:^|[\\s,;])([A-Za-z0-9_]+)=([^\\s,;]+)/g;
        for (const raw of rawCookies) {
          let match;
          while ((match = cookieRegex.exec(raw)) !== null) {
            const key = match[1];
            const val = match[2];
            if (!['path', 'domain', 'expires', 'max-age', 'samesite', 'secure', 'httponly'].includes(key.toLowerCase())) {
              cookieMap.set(key, val);
            }
          }
        }

        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const loc = response.headers.get('Location');
          currentUrl = loc ? new URL(loc, currentUrl).href : currentUrl;
          hops++;
          continue;
        }

        break;
      }

      const body = await response.text();
      return new Response(body, {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': response.headers.get('Content-Type') || 'application/json; charset=utf-8',
          'Cache-Control': response.ok ? 'public, max-age=30' : 'no-cache, no-store, must-revalidate',
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 502, headers: corsHeaders });
    }
  }
};`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(workerCode);
    setHasCopiedCode(true);
    setTimeout(() => setHasCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                تنظیمات پروکسی و اتصال زنده (CORS)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                عبور از محدودیت‌های مرورگر جهت استعلام مستقیم چارت‌ها
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-right">
          {/* Status info */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 leading-relaxed space-y-1">
            <p className="font-bold">
              ⚡ استعلام زنده و مستقیم با Cloudflare Worker (مشابه چندچندی):
            </p>
            <p>
              پروکسی‌های عمومی متفرقه (مانند corsproxy.io) به دلیل پولی شدن با خطای ۴۰۱ مواجه می‌شوند. مطمئن‌ترین و سریع‌ترین راه، ورکر شخصی کلودفلر است (۱۰۰٬۰۰۰ استعلام رایگان در روز). اگر برای پروژه چندچندی قبلاً ورکر ساخته‌اید، می‌توانید دقیقاً همان آدرس را وارد کنید.
            </p>
          </div>

          {/* Preset Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              انتخاب پروکسی فعال:
            </label>
            <div className="grid grid-cols-1 gap-2">
              {/* Custom Cloudflare Worker Option (Recommended, First) */}
              <label
                onClick={() => setSelectedPreset('custom')}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  selectedPreset === 'custom'
                    ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 ring-1 ring-red-500'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="proxyPreset"
                  checked={selectedPreset === 'custom'}
                  onChange={() => setSelectedPreset('custom')}
                  className="mt-1 text-red-600 focus:ring-red-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 block">
                      ورکر اختصاصی کلودفلر (Cloudflare Worker شخصی)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      پیشنهادی
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    سریع‌ترین روش بدون هیچ‌گونه محدودیت یا خطای ۴۰۱ (۱۰۰٬۰۰۰ استعلام رایگان در روز)
                  </span>
                </div>
              </label>

              {DEFAULT_PROXIES.map((preset) => (
                <label
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.id)}
                  className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                    selectedPreset === preset.id
                      ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 ring-1 ring-red-500'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="proxyPreset"
                    checked={selectedPreset === preset.id}
                    onChange={() => setSelectedPreset(preset.id)}
                    className="mt-1 text-red-600 focus:ring-red-500"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 block">
                      {preset.name}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      {preset.description}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Custom URL Input */}
          {selectedPreset === 'custom' && (
            <div className="space-y-1.5 animate-in fade-in duration-200">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                آدرس ورکر کلودفلر یا پروکسی اختصاصی:
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  dir="ltr"
                  placeholder="https://my-proxy.your-subdomain.workers.dev/?url="
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full pr-10 pl-3 py-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                فرمت معتبر: آدرسی که در انتهای آن <code className="text-red-500">?url=</code> یا <code className="text-red-500">?</code> قرار دارد.
              </p>
            </div>
          )}

          {/* Test connection row */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                تست سلامت پروکسی
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                بررسی دریافت چارت نمونه از سرورهای دیجی‌کالا
              </span>
            </div>
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl transition-all shadow-sm disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-500" />
                  <span>در حال بررسی...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>تست اتصال</span>
                </>
              )}
            </button>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="font-bold block">
                  {testResult.success
                    ? 'اتصال با موفقیت برقرار شد!'
                    : 'خطا در برقراری ارتباط با دیجی‌کالا'}
                </span>
                <span className="text-[11px] block mt-0.5">
                  {testResult.success
                    ? `زمان پاسخگویی (Ping): ${testResult.latencyMs} میلی‌ثانیه`
                    : testResult.error}
                </span>
              </div>
            </div>
          )}

          {/* Deploy Worker Guide Drawer */}
          <details className="group border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <summary className="p-3 bg-slate-50 dark:bg-slate-800/40 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer flex items-center justify-between select-none">
              <span>راهنمای راه‌اندازی پروکسی شخصی در ۱ دقیقه (Cloudflare Workers)</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-4 space-y-3 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <ol className="list-decimal pr-4 space-y-1.5 leading-relaxed">
                <li>وارد پنل رایگان <a href="https://workers.cloudflare.com" target="_blank" rel="noreferrer" className="text-red-500 font-bold underline inline-flex items-center gap-0.5">Cloudflare Workers <ExternalLink className="w-3 h-3" /></a> شوید.</li>
                <li>یک Worker جدید بسازید و نام دلخواهی مانند <code className="text-red-600 font-mono">digicheck-proxy</code> انتخاب کنید.</li>
                <li>کد زیر را کپی کرده، در ویرایشگر کلودفلر جایگزین و <strong>Save and Deploy</strong> کنید:</li>
              </ol>

              <div className="relative">
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-36">
                  {workerCode}
                </pre>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="absolute top-2 left-2 px-2.5 py-1 text-[10px] font-bold bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center gap-1 transition-all"
                >
                  {hasCopiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{hasCopiedCode ? 'کپی شد!' : 'کپی سورس'}</span>
                </button>
              </div>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            بازنشانی به پیش‌فرض
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md shadow-red-500/20 transition-all"
            >
              {saveSuccess ? <Check className="w-4 h-4" /> : null}
              <span>{saveSuccess ? 'ذخیره شد' : 'ذخیره تنظیمات'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
