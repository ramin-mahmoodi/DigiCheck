import requests
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
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
            'reason': 'داده‌های تاریخچه قیمت برای این کالا در دسترس نیست.',
            'min_30d': selling_price,
            'max_30d': rrp_price,
            'avg_30d': selling_price,
            'price_diff_30d_min': 0,
            'price_diff_percent': 0,
            'is_all_time_low': False,
            'rrp_inflated': False
        }

    # Extract clean history points (only marketable if possible)
    valid_points = [p for p in history if p.get('selling_price') and p.get('selling_price') > 0]
    if not valid_points:
        valid_points = history

    # Last 30 points (roughly last 30 days of records)
    recent_30 = valid_points[-30:]
    recent_selling = [p['selling_price'] for p in recent_30]
    recent_rrp = [p.get('rrp_price', p['selling_price']) for p in recent_30]

    min_30d = min(recent_selling)
    max_30d = max(recent_selling)
    avg_30d = int(sum(recent_selling) / len(recent_selling))
    all_time_min = min(p['selling_price'] for p in valid_points)

    # Point right before the offer (1 or 2 entries before the last)
    prev_point = valid_points[-2] if len(valid_points) >= 2 else valid_points[-1]
    prev_selling = prev_point['selling_price']
    prev_rrp = prev_point.get('rrp_price', prev_selling)

    is_all_time_low = (selling_price <= all_time_min)
    is_30d_low = (selling_price <= min_30d)

    # Check RRP inflation: Did RRP increase significantly right before or at discount?
    rrp_inflated = False
    if prev_rrp > 0 and rrp_price > prev_rrp * 1.15 and selling_price >= prev_selling * 0.98:
        rrp_inflated = True

    # Price difference from 30d minimum
    diff_from_min = selling_price - min_30d
    diff_from_prev = selling_price - prev_selling

    # Calculate Verdict
    # Case 1: Fake - RRP inflated artificially while selling price didn't drop
    if rrp_inflated:
        verdict = 'FAKE_INFLATED'
        verdict_label = 'تخفیف کاذب (باد کردن قیمت پایه)'
        verdict_color = 'red'
        score = 15
        reason = f'قیمت خط‌خورده به صورت صوری از {prev_rrp:,} به {rrp_price:,} ریال افزایش یافته است؛ قیمت فروش عملاً ارزان نشده است.'

    # Case 2: Fake - Current selling price is higher than previous days
    elif diff_from_prev > 0 and selling_price > prev_selling * 1.03:
        verdict = 'FAKE_MORE_EXPENSIVE'
        verdict_label = 'تخفیف الکی (گران‌تر از دیروز!)'
        verdict_color = 'red'
        score = 10
        reason = f'قیمت فعلی کالا در شگفت‌انگیز حتی از قیمت روز قبل ({prev_selling:,} ریال) گران‌تر است!'

    # Case 3: Fake - Current selling price is exactly equal to normal previous price
    elif abs(diff_from_prev) < prev_selling * 0.01 and selling_price >= avg_30d * 0.98:
        verdict = 'FAKE_UNCHANGED'
        verdict_label = 'تخفیف صوری (بدون تغییر قیمت)'
        verdict_color = 'orange'
        score = 30
        reason = f'این کالا در روزهای گذشته نیز با همین قیمت ({prev_selling:,} ریال) به فروش می‌رسیده و تخفیف واقعی داده نشده است.'

    # Case 4: Great Deal - All-time low or lowest in 30 days
    elif is_30d_low or is_all_time_low:
        verdict = 'REAL_GREAT'
        verdict_label = 'تخفیف ۱۰۰٪ واقعی (کف قیمت ماه)'
        verdict_color = 'green'
        score = 95 if is_all_time_low else 88
        reason = f'قیمت فعلی ({selling_price:,} ریال) ارزان‌ترین قیمت ثبت‌شده در ۳۰ روز اخیر برای این کالا است.'

    # Case 5: Moderate Deal - Below 30d average and cheaper than yesterday
    elif selling_price < avg_30d and selling_price < prev_selling:
        verdict = 'REAL_MODERATE'
        verdict_label = 'تخفیف واقعی و منصفانه'
        verdict_color = 'emerald'
        score = 75
        saving_percent = round((1 - selling_price / avg_30d) * 100)
        reason = f'قیمت فعلی حدود {saving_percent}٪ پایین‌تر از میانگین قیمت یک ماه گذشته کالا است.'

    # Default: Slight discount or neutral
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

def fetch_chart(product_id: int):
    """Fetch price chart for a single product and return history"""
    url = PRICE_CHART_URL_TEMPLATE.format(product_id=product_id)
    try:
        res = requests.get(url, headers=HEADERS, timeout=8)
        if res.status_code == 200:
            json_data = res.json()
            pc = json_data.get('data', {}).get('price_chart', [])
            if pc and len(pc) > 0 and 'history' in pc[0]:
                return pc[0]['history']
            elif pc and len(pc) > 0 and 'history' in pc[-1]:
                return pc[-1]['history']
        return []
    except Exception as e:
        print(f"Error fetching chart for {product_id}: {e}")
        return []

def main():
    print("🚀 Starting Digikala Incredible Offers Crawler & Price Analyzer...")
    start_time = time.time()

    # 1. Fetch Offers
    res = requests.get(DIGIKALA_OFFERS_URL, headers=HEADERS, timeout=12)
    if res.status_code != 200:
        print(f"❌ Failed to fetch offers: HTTP {res.status_code}")
        sys.exit(1)

    data = res.json().get('data', {})
    main_categories = data.get('main_categories', [])
    print(f"✅ Received main categories: {len(main_categories)}")

    # 2. Extract products from separate offer categories
    categorized_offers = {}
    all_product_ids = set()
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

            # Extract main image
            images = p.get('images', {})
            main_img = images.get('main', {}).get('url', [''])[0] if isinstance(images.get('main', {}).get('url'), list) and images.get('main', {}).get('url') else ''

            # Extract category
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
            product_map[pid] = prod_item

        categorized_offers[key] = {
            'key': key,
            'title': meta['title'],
            'badge': meta['badge'],
            'icon': meta['icon'],
            'count': len(formatted_products),
            'products': formatted_products
        }

    print(f"📊 Total unique products to analyze: {len(all_product_ids)}")

    # 3. Concurrently fetch price charts for all unique products
    print("⏳ Fetching price charts and running analysis algorithm...")
    chart_cache = {}

    with ThreadPoolExecutor(max_workers=6) as executor:
        future_to_pid = {executor.submit(fetch_chart, pid): pid for pid in all_product_ids}
        for future in as_completed(future_to_pid):
            pid = future_to_pid[future]
            try:
                history = future.result()
                chart_cache[pid] = history
            except Exception as e:
                chart_cache[pid] = []

    # 4. Run Analysis & Save Individual Chart JSONs
    verdict_counts = {}
    for pid, history in chart_cache.items():
        prod = product_map.get(pid)
        if not prod:
            continue

        if history and len(history) > 0:
            analysis = analyze_discount(
                prod['selling_price'],
                prod['rrp_price'],
                prod['discount_percent'],
                history
            )
            prod['has_chart'] = True
            prod['analysis'] = analysis

            verdict_key = analysis['verdict']
            verdict_counts[verdict_key] = verdict_counts.get(verdict_key, 0) + 1

            # Save individual chart file for fast modal fetch
            chart_file_path = os.path.join(CHARTS_DIR, f"{pid}.json")
            with open(chart_file_path, 'w', encoding='utf-8') as cf:
                json.dump({
                    'product_id': pid,
                    'title': prod['title_fa'],
                    'selling_price': prod['selling_price'],
                    'rrp_price': prod['rrp_price'],
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
    print(f"✨ Successfully generated '{output_file_path}' in {elapsed:.2f} seconds!")
    print(f"📈 Verdict Distribution: {verdict_counts}")

if __name__ == '__main__':
    main()
