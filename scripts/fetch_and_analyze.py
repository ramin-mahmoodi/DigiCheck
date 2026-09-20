import requests
import json
import os
import sys
import time
from datetime import datetime

# Set UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DATA_DIR = os.path.join(BASE_DIR, 'public', 'data')
CHARTS_DIR = os.path.join(PUBLIC_DATA_DIR, 'charts')

os.makedirs(CHARTS_DIR, exist_ok=True)

DIGIKALA_OFFERS_URL = "https://api.digikala.com/v1/incredible-offers/"
PRICE_CHART_URL_TEMPLATE = "https://api.digikala.com/v1/product/{product_id}/price-chart/"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Referer": "https://www.digikala.com/",
    "Origin": "https://www.digikala.com",
    "Accept": "application/json, text/plain, */*",
}

OFFER_CATEGORY_KEYS = {
    'incredible_products_list': {
        'title': 'پیشنهادهای شگفت‌انگیز اصلی',
        'badge': 'شگفت‌انگیز اصلی',
        'icon': 'Sparkles'
    },
    'lightening_deal_products': {
        'title': 'پیشنهاد برق‌آسا',
        'badge': 'برق‌آسا',
        'icon': 'Zap'
    },
    'deal_of_the_day_products': {
        'title': 'پیشنهادهای روز',
        'badge': 'پیشنهاد روز',
        'icon': 'Calendar'
    },
    'running_out_incredible_products': {
        'title': 'شگفت‌انگیزهای در حال اتمام',
        'badge': 'رو به اتمام',
        'icon': 'Clock'
    },
    'fresh_incredible_products': {
        'title': 'شگفت‌انگیز سوپرمارکتی',
        'badge': 'سوپرمارکت',
        'icon': 'ShoppingBag'
    },
    'teasing_incredible_products': {
        'title': 'به‌زودی در شگفت‌انگیز',
        'badge': 'به‌زودی',
        'icon': 'Eye'
    }
}

def analyze_discount(selling_price: int, rrp_price: int, discount_percent: int, history: list):
    """
    Analyzes price chart history to determine if a discount is REAL, MODERATE, or FAKE.
    """
    if not history or len(history) < 2:
        return {
            'verdict': 'UNKNOWN',
            'verdict_label': 'تاریخچه ناکافی',
            'verdict_color': 'gray',
            'score': 50,
            'reason': 'داده‌های تاریخچه قیمت برای این کالا کمتر از ۲ رکورد است.',
            'min_30d': selling_price,
            'max_30d': rrp_price,
            'avg_30d': selling_price,
            'price_diff_30d_min': 0,
            'price_diff_percent': 0,
            'is_all_time_low': False,
            'rrp_inflated': False
        }

    valid_points = [p for p in history if p.get('selling_price') and p.get('selling_price') > 0]
    if not valid_points:
        valid_points = history

    recent_30 = valid_points[-30:]
    recent_selling = [p['selling_price'] for p in recent_30]

    min_30d = min(recent_selling)
    max_30d = max(recent_selling)
    avg_30d = int(sum(recent_selling) / len(recent_selling))
    all_time_min = min(p['selling_price'] for p in valid_points)

    prev_point = valid_points[-2] if len(valid_points) >= 2 else valid_points[-1]
    prev_selling = prev_point['selling_price']
    prev_rrp = prev_point.get('rrp_price', prev_selling)

    is_all_time_low = (selling_price <= all_time_min)
    is_30d_low = (selling_price <= min_30d)

    rrp_inflated = False
    if prev_rrp > 0 and rrp_price > prev_rrp * 1.15 and selling_price >= prev_selling * 0.98:
        rrp_inflated = True

    diff_from_min = selling_price - min_30d
    diff_from_prev = selling_price - prev_selling

    if rrp_inflated:
        verdict = 'FAKE_INFLATED'
        verdict_label = 'تخفیف کاذب (باد کردن قیمت پایه)'
        verdict_color = 'red'
        score = 15
        reason = f'قیمت خط‌خورده به صورت صوری از {prev_rrp:,} به {rrp_price:,} ریال افزایش یافته است؛ قیمت واقعی ارزان نشده است.'
    elif diff_from_prev > 0 and selling_price > prev_selling * 1.03:
        verdict = 'FAKE_MORE_EXPENSIVE'
        verdict_label = 'تخفیف الکی (گران‌تر از دیروز!)'
        verdict_color = 'red'
        score = 10
        reason = f'قیمت فعلی کالا در شگفت‌انگیز حتی از قیمت روز قبل ({prev_selling:,} ریال) گران‌تر است!'
    elif abs(diff_from_prev) < prev_selling * 0.01 and selling_price >= avg_30d * 0.98:
        verdict = 'FAKE_UNCHANGED'
        verdict_label = 'تخفیف صوری (بدون تغییر قیمت)'
        verdict_color = 'orange'
        score = 30
        reason = f'این کالا در روزهای گذشته نیز با همین قیمت ({prev_selling:,} ریال) به فروش می‌رسیده و تخفیف جدیدی ندارد.'
    elif is_30d_low or is_all_time_low:
        verdict = 'REAL_GREAT'
        verdict_label = 'تخفیف ۱۰۰٪ واقعی (کف قیمت ماه)'
        verdict_color = 'green'
        score = 95 if is_all_time_low else 88
        reason = f'قیمت فعلی ({selling_price:,} ریال) ارزان‌ترین قیمت ثبت‌شده در ۳۰ روز اخیر برای این کالا است.'
    elif selling_price < avg_30d and selling_price < prev_selling:
        verdict = 'REAL_MODERATE'
        verdict_label = 'تخفیف واقعی و منصفانه'
        verdict_color = 'emerald'
        score = 75
        saving_percent = round((1 - selling_price / avg_30d) * 100)
        reason = f'قیمت فعلی حدود {saving_percent}٪ پایین‌تر از میانگین قیمت یک ماه گذشته کالا است.'
    else:
        verdict = 'NEUTRAL'
        verdict_label = 'تخفیف جزئی'
        verdict_color = 'blue'
        score = 50
        reason = 'قیمت کالا تفاوت محسوسی با نوسانات عادی روزهای گذشته ندارد.'

    return {
        'verdict': verdict,
        'verdict_label': verdict_label,
        'verdict_color': verdict_color,
        'score': score,
        'reason': reason,
        'min_30d': min_30d,
        'max_30d': max_30d,
        'avg_30d': avg_30d,
        'price_diff_30d_min': diff_from_min,
        'price_diff_percent': round((diff_from_prev / prev_selling) * 100, 1) if prev_selling else 0,
        'is_all_time_low': is_all_time_low,
        'rrp_inflated': rrp_inflated,
        'prev_selling': prev_selling,
        'prev_rrp': prev_rrp,
    }

def fetch_chart_with_retry(session: requests.Session, product_id: int, max_retries: int = 2):
    """Fetch price chart with backoff on rate limits"""
    url = PRICE_CHART_URL_TEMPLATE.format(product_id=product_id)

    for attempt in range(max_retries + 1):
        try:
            res = session.get(url, headers=HEADERS, timeout=8)
            if res.status_code == 200:
                json_data = res.json()
                pc = json_data.get('data', {}).get('price_chart', [])
                if pc and len(pc) > 0 and 'history' in pc[0]:
                    return pc[0]['history']
                elif pc and len(pc) > 0 and 'history' in pc[-1]:
                    return pc[-1]['history']
                return []
            elif res.status_code in (400, 429):
                # Rate limit hit - backoff
                print(f"⚠️ Rate limit for {product_id} (Attempt {attempt+1}/{max_retries+1}). Waiting 12s...")
                time.sleep(12)
            else:
                time.sleep(0.5)
        except Exception as e:
            print(f"Network error for {product_id}: {e}")
            time.sleep(1)

    return []

def main():
    print("🚀 Starting Digikala Incredible Offers Crawler & Price Analyzer (V2)...")
    start_time = time.time()

    session = requests.Session()

    # 1. Fetch Offers
    res = session.get(DIGIKALA_OFFERS_URL, headers=HEADERS, timeout=12)
    if res.status_code != 200:
        print(f"❌ Failed to fetch offers: HTTP {res.status_code}")
        sys.exit(1)

    data = res.json().get('data', {})
    main_categories = data.get('main_categories', [])
    print(f"✅ Received main categories: {len(main_categories)}")

    # 2. Extract products from separate offer categories
    categorized_offers = {}
    all_product_ids = set()
    # Map pid to a LIST of product references across all categories
    product_map = {}

    for key, meta in OFFER_CATEGORY_KEYS.items():
        cat_data = data.get(key, {})
        products_raw = cat_data.get('products', []) if isinstance(cat_data, dict) else []
        print(f"📦 Category '{meta['title']}': {len(products_raw)} products found")

        formatted_products = []
        for p in products_raw:
            pid = p.get('id')
            if not pid:
                continue

            price_info = p.get('default_variant', {}).get('price', {})
            selling_price = price_info.get('selling_price', 0)
            rrp_price = price_info.get('rrp_price', selling_price)
            discount_percent = price_info.get('discount_percent', 0)

            images = p.get('images', {})
            main_img = images.get('main', {}).get('url', [''])[0] if isinstance(images.get('main', {}).get('url'), list) and images.get('main', {}).get('url') else ''

            cat_id = None
            if 'category' in p and isinstance(p['category'], dict):
                cat_id = p['category'].get('id')

            url_uri = p.get('url', {}).get('uri', f"/product/dkp-{pid}/")

            prod_item = {
                'id': pid,
                'title_fa': p.get('title_fa', ''),
                'title_en': p.get('title_en', ''),
                'image': main_img,
                'selling_price': selling_price,
                'rrp_price': rrp_price,
                'discount_percent': discount_percent,
                'rating': p.get('rating', {}).get('rate', 0) if isinstance(p.get('rating'), dict) else 0,
                'rating_count': p.get('rating', {}).get('count', 0) if isinstance(p.get('rating'), dict) else 0,
                'category_id': cat_id,
                'url': f"https://www.digikala.com{url_uri}",
                'offer_type': key,
                'offer_type_title': meta['title'],
                'has_chart': False,
                'analysis': None
            }

            formatted_products.append(prod_item)
            all_product_ids.add(pid)
            product_map.setdefault(pid, []).append(prod_item)

        categorized_offers[key] = {
            'key': key,
            'title': meta['title'],
            'badge': meta['badge'],
            'icon': meta['icon'],
            'count': len(formatted_products),
            'products': formatted_products
        }

    print(f"📊 Total unique products: {len(all_product_ids)}")

    # 3. Smart Chart Fetching (Check disk cache first, then fetch uncached with gentle delay)
    print("⏳ Processing price charts and running analysis algorithm...")
    chart_cache = {}
    uncached_pids = []

    for pid in all_product_ids:
        chart_file_path = os.path.join(CHARTS_DIR, f"{pid}.json")
        if os.path.exists(chart_file_path):
            try:
                with open(chart_file_path, 'r', encoding='utf-8') as cf:
                    cached_data = json.load(cf)
                    if cached_data.get('history'):
                        chart_cache[pid] = cached_data['history']
            except Exception:
                uncached_pids.append(pid)
        else:
            uncached_pids.append(pid)

    print(f"📁 Already cached on disk: {len(chart_cache)} products")
    print(f"🌐 Need to fetch online: {len(uncached_pids)} products")

    # Fetch uncached products sequentially with gentle delay to avoid 429
    for i, pid in enumerate(uncached_pids):
        print(f"  [{i+1}/{len(uncached_pids)}] Fetching chart for {pid}...")
        history = fetch_chart_with_retry(session, pid)
        if history:
            chart_cache[pid] = history
        time.sleep(0.4)

    # 4. Run Analysis & Save Chart JSONs & Update ALL references
    verdict_counts = {}
    for pid, history in chart_cache.items():
        prod_list = product_map.get(pid, [])
        if not prod_list:
            continue

        sample_prod = prod_list[0]

        if history and len(history) > 0:
            analysis = analyze_discount(
                sample_prod['selling_price'],
                sample_prod['rrp_price'],
                sample_prod['discount_percent'],
                history
            )

            # Update ALL occurrences of this product across categories!
            for prod in prod_list:
                prod['has_chart'] = True
                prod['analysis'] = analysis

            verdict_key = analysis['verdict']
            verdict_counts[verdict_key] = verdict_counts.get(verdict_key, 0) + 1

            # Save / update individual chart file
            chart_file_path = os.path.join(CHARTS_DIR, f"{pid}.json")
            with open(chart_file_path, 'w', encoding='utf-8') as cf:
                json.dump({
                    'product_id': pid,
                    'title': sample_prod['title_fa'],
                    'selling_price': sample_prod['selling_price'],
                    'rrp_price': sample_prod['rrp_price'],
                    'analysis': analysis,
                    'history': history
                }, cf, ensure_ascii=False)

    # 5. Build Final Aggregated Output
    final_output = {
        'last_updated': datetime.now().isoformat(),
        'last_updated_fa': datetime.now().strftime("%Y/%m/%d - %H:%M"),
        'total_products': len(all_product_ids),
        'stats': verdict_counts,
        'main_categories': main_categories,
        'offer_categories': categorized_offers
    }

    output_file_path = os.path.join(PUBLIC_DATA_DIR, 'offers.json')
    with open(output_file_path, 'w', encoding='utf-8') as f:
        json.dump(final_output, f, ensure_ascii=False, indent=2)

    elapsed = time.time() - start_time
    total_with_chart = sum(verdict_counts.values())
    print(f"✨ Successfully completed in {elapsed:.2f} seconds!")
    print(f"📊 Total products with charts: {total_with_chart} / {len(all_product_ids)}")
    print(f"📈 Verdict Distribution: {verdict_counts}")

if __name__ == '__main__':
    main()
