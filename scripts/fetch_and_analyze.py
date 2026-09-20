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
    'deal_of_the_day_products': {
        'title': 'منتخب روز',
        'badge': 'منتخب روز',
        'icon': 'Zap'
    },
    'lightening_deal_products': {
        'title': 'شگفت‌انگیز آنی و لحظه‌ای',
        'badge': 'تخفیف آنی',
        'icon': 'Clock'
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
        'icon': 'Calendar'
    },
    'digiplus_incredible_products': {
        'title': 'شگفت‌انگیز دیجی‌پلاس',
        'badge': 'دیجی‌پلاس',
        'icon': 'Eye'
    }
}

def analyze_discount(selling_price: int, rrp_price: int, discount_percent: int, history: list):
    """
    Analyzes historical price data to judge if a deal is REAL or FAKE.
    """
    if not history or len(history) == 0:
        return None

    # Sort history chronologically
    sorted_history = sorted(history, key=lambda x: x.get('day', ''))
    
    # Selling prices across history
    sell_prices = [p.get('selling_price', 0) for p in sorted_history if p.get('selling_price', 0) > 0]
    if not sell_prices:
        return None

    # 30-day window
    recent_30d = sell_prices[-30:] if len(sell_prices) >= 30 else sell_prices
    min_30d = min(recent_30d)
    max_30d = max(recent_30d)
    avg_30d = sum(recent_30d) / len(recent_30d)
    
    all_time_min = min(sell_prices)

    prev_selling = sorted_history[-2].get('selling_price', selling_price) if len(sorted_history) >= 2 else selling_price
    prev_rrp = sorted_history[-2].get('rrp_price', rrp_price) if len(sorted_history) >= 2 else rrp_price

    diff_from_min = selling_price - min_30d
    diff_from_prev = selling_price - prev_selling
    rrp_inflated = (rrp_price > prev_rrp * 1.08) and (selling_price >= prev_selling * 0.98)
    is_all_time_low = selling_price <= all_time_min * 1.01
    is_30d_low = selling_price <= min_30d * 1.01

    # Verdict Rules
    if rrp_inflated:
        verdict = 'FAKE_INFLATED'
        verdict_label = 'تخفیف صوری (افزایش ساختگی قیمت خط‌خورده)'
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

def fetch_chart_with_retry(session: requests.Session, product_id: int):
    """Fetch price chart with quick timeout and graceful handling"""
    url = PRICE_CHART_URL_TEMPLATE.format(product_id=product_id)
    try:
        res = session.get(url, headers=HEADERS, timeout=6)
        if res.status_code == 200:
            json_data = res.json()
            pc = json_data.get('data', {}).get('price_chart', [])
            if pc and len(pc) > 0 and 'history' in pc[0]:
                return pc[0]['history']
            elif pc and len(pc) > 0 and 'history' in pc[-1]:
                return pc[-1]['history']
            return []
        elif res.status_code in (400, 429):
            time.sleep(1)
            return []
    except Exception:
        pass
    return []

def main():
    print("🚀 Starting Digikala Incredible Offers Crawler & Price Analyzer...", flush=True)
    start_time = time.time()

    session = requests.Session()

    # 1. Fetch Offers
    res = session.get(DIGIKALA_OFFERS_URL, headers=HEADERS, timeout=12)
    if res.status_code != 200:
        print(f"❌ Failed to fetch offers: HTTP {res.status_code}", flush=True)
        sys.exit(1)

    data = res.json().get('data', {})
    main_categories = data.get('main_categories', [])
    print(f"✅ Received main categories: {len(main_categories)}", flush=True)

    # 2. Extract products from separate offer categories
    categorized_offers = {}
    all_product_ids = set()
    product_map = {}

    for key, meta in OFFER_CATEGORY_KEYS.items():
        cat_data = data.get(key, {})
        products_raw = cat_data.get('products', []) if isinstance(cat_data, dict) else []
        print(f"📦 Category '{meta['title']}': {len(products_raw)} products found", flush=True)

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

            cat_title = p.get('data_layer', {}).get('item_category2') or 'سایر'
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
                'category_title': cat_title,
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

    # 2.1 Fetch individual main categories (so categories like اسباب بازی, کتاب, etc. have all their products!)
    print("🔍 Fetching individual main categories to ensure full coverage...", flush=True)
    for c in main_categories:
        cid = c.get('id')
        ctitle = c.get('title')
        if not cid:
            continue
        try:
            cat_url = f"https://api.digikala.com/v1/incredible-offers/?category_id={cid}"
            cres = session.get(cat_url, headers=HEADERS, timeout=10)
            if cres.status_code == 200:
                cdata = cres.json().get('data', {})
                c_prods = cdata.get('incredible_products_list', {}).get('products', [])
                added_count = 0
                for p in c_prods:
                    pid = p.get('id')
                    if not pid:
                        continue
                    price_info = p.get('default_variant', {}).get('price', {})
                    selling_price = price_info.get('selling_price', 0)
                    rrp_price = price_info.get('rrp_price', selling_price)
                    discount_percent = price_info.get('discount_percent', 0)

                    images = p.get('images', {})
                    main_img = images.get('main', {}).get('url', [''])[0] if isinstance(images.get('main', {}).get('url'), list) and images.get('main', {}).get('url') else ''
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
                        'category_id': cid,
                        'category_title': ctitle,
                        'url': f"https://www.digikala.com{url_uri}",
                        'offer_type': 'incredible_products_list',
                        'offer_type_title': OFFER_CATEGORY_KEYS['incredible_products_list']['title'],
                        'has_chart': False,
                        'analysis': None
                    }

                    if pid not in all_product_ids:
                        categorized_offers['incredible_products_list']['products'].append(prod_item)
                        all_product_ids.add(pid)
                        product_map.setdefault(pid, []).append(prod_item)
                        added_count += 1
                    else:
                        for existing in product_map.get(pid, []):
                            if not existing.get('category_id'):
                                existing['category_id'] = cid
                            if existing.get('category_title') in ('سایر', None):
                                existing['category_title'] = ctitle

                print(f"  └─ [{cid}] {ctitle}: {len(c_prods)} products ({added_count} new)", flush=True)
            time.sleep(0.2)
        except Exception as e:
            print(f"  ⚠️ Error fetching category {ctitle} ({cid}): {e}", flush=True)

    # Update category counts
    for k in categorized_offers:
        categorized_offers[k]['count'] = len(categorized_offers[k]['products'])

    print(f"📊 Total unique products across all categories: {len(all_product_ids)}", flush=True)

    # 3. Smart Chart Fetching (Check disk cache first, then fetch uncached)
    print("⏳ Processing price charts and running analysis algorithm...", flush=True)
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

    print(f"📁 Already cached on disk: {len(chart_cache)} products", flush=True)
    print(f"🌐 Need to fetch online: {len(uncached_pids)} products", flush=True)

    # Fetch uncached products sequentially with gentle delay
    for i, pid in enumerate(uncached_pids):
        print(f"  [{i+1}/{len(uncached_pids)}] Fetching chart for {pid}...", flush=True)
        history = fetch_chart_with_retry(session, pid)
        if history:
            chart_cache[pid] = history
            # Write immediately to cache
            chart_file_path = os.path.join(CHARTS_DIR, f"{pid}.json")
            try:
                with open(chart_file_path, 'w', encoding='utf-8') as cf:
                    json.dump({'product_id': pid, 'history': history}, cf, ensure_ascii=False)
            except Exception:
                pass
        time.sleep(0.3)

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

            if analysis:
                for prod in prod_list:
                    prod['has_chart'] = True
                    prod['analysis'] = analysis

                verdict_key = analysis['verdict']
                verdict_counts[verdict_key] = verdict_counts.get(verdict_key, 0) + 1

                # Save / update individual chart file
                chart_file_path = os.path.join(CHARTS_DIR, f"{pid}.json")
                try:
                    with open(chart_file_path, 'w', encoding='utf-8') as cf:
                        json.dump({
                            'product_id': pid,
                            'title': sample_prod['title_fa'],
                            'selling_price': sample_prod['selling_price'],
                            'rrp_price': sample_prod['rrp_price'],
                            'analysis': analysis,
                            'history': history
                        }, cf, ensure_ascii=False)
                except Exception:
                    pass

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
    print(f"✨ Successfully completed in {elapsed:.2f} seconds!", flush=True)
    print(f"📊 Total products with charts: {total_with_chart} / {len(all_product_ids)}", flush=True)
    print(f"📈 Verdict Distribution: {verdict_counts}", flush=True)

if __name__ == '__main__':
    main()
