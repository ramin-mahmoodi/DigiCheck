import requests
import json
import os
import sys
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# Ensure UTF-8 stdout
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DATA_DIR = os.path.join(BASE_DIR, 'public', 'data')
CHARTS_DIR = os.path.join(PUBLIC_DATA_DIR, 'charts')

os.makedirs(CHARTS_DIR, exist_ok=True)

# Web headers (accepted by api.digikala.com with 200 OK)
HEADERS_WEB = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Referer": "https://www.digikala.com/",
    "Origin": "https://www.digikala.com",
    "Accept": "application/json, text/plain, */*",
}

# Mobile App Headers (extracted from Digikala APK 3.2.3, accepted by sirius.digikala.com)
HEADERS_ANDROID = {
    "User-Agent": "Digikala/3.2.3 (Android 14; Mobile; Pixel 7)",
    "X-App-Version": "3.2.3",
    "X-Agent-Type": "android",
    "Accept": "application/json",
}

DIGIKALA_LANDING_URL = "https://api.digikala.com/v1/incredible-offers/"
SIRIUS_PAGINATED_URL = "https://sirius.digikala.com/v1/incredible-offers/products/?page={page}"
PRICE_CHART_URL_TEMPLATE = "https://api.digikala.com/v1/product/{product_id}/price-chart/"

OFFER_CATEGORY_KEYS = {
    'all_offers_list': {
        'title': 'همه کالاها',
        'badge': 'کاتالوگ کامل',
        'icon': 'Layers'
    },
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
        'icon': 'Flame'
    },
    'fresh_incredible_products': {
        'title': 'شگفت‌انگیز سوپرمارکتی',
        'badge': 'سوپرمارکت',
        'icon': 'ShoppingBag'
    },
    'digiplus_incredible_products': {
        'title': 'شگفت‌انگیز دیجی‌پلاس',
        'badge': 'دیجی‌پلاس',
        'icon': 'Eye'
    }
}

MAIN_CATEGORY_KEYWORDS = {
    'موبایل': ['موبایل', 'گوشی', 'آیفون', 'سامسونگ', 'شیائومی', 'نوکیا'],
    'کالای دیجیتال': ['لپ تاپ', 'تبلت', 'ساعت هوشمند', 'هدفون', 'هندزفری', 'پاوربانک', 'کابل شارژ', 'اسپیکر', 'ماوس', 'کیبورد', 'فلش', 'هارد', 'مودم', 'کامپیوتر'],
    'اسباب بازی': ['اسباب بازی', 'لگو', 'عروسک', 'ماشین بازی', 'پازل', 'فیگور', 'تفنگ اسباب بازی'],
    'طلا و نقره': ['طلا', 'نقره', 'زیورآلات', 'دستبند', 'گردنبند', 'گوشواره', 'انگشتر', 'پلاک'],
    'مد و پوشاک': ['جوراب', 'کفش', 'کتونی', 'پیراهن', 'شلوار', 'تی شرت', 'لباس', 'مانتو', 'کیف', 'صندل', 'پالتو', 'کاپشن', 'کمربند'],
    'خانه و آشپزخانه': ['آشپزخانه', 'ظروف', 'قابلمه', 'ماگ', 'ساعت دیواری', 'پتو', 'فرش', 'مبلمان', 'چراغ خواب', 'دکوری', 'تخت', 'حوله', 'کوسن', 'سرویس خواب'],
    'لوازم خانگی برقی': ['چرخ خیاطی', 'جاروبرقی', 'مایکروویو', 'سشوار', 'ریش تراش', 'ماساژور', 'غذاساز', 'مخلوط کن', 'اتو', 'پنکه', 'قهوه ساز', 'چای ساز', 'خردکن'],
    'کتاب، لوازم تحریر و هنر': ['کتاب', 'دفتر', 'خودکار', 'مداد', 'روان نویس', 'ماژیک', 'رنگ روغن', 'بوم', 'کاغذ'],
    'پت شاپ': ['سگ', 'گربه', 'غذای خشک', 'حیوانات', 'تشویقی', 'باکس', 'خاک گربه', 'قلاده'],
    'مادر و کودک': ['نوزاد', 'پوشک', 'شیشه شیر', 'پستانک', 'کالسکه', 'شیر دوش', 'بهداشت کودک'],
    'سلامت و پزشکی': ['ماسک', 'فشارسنج', 'ترازو', 'تب سنج', 'دستکش', 'شست‌وشوی دهان', 'ارتوپدی', 'تجهیزات پزشکی'],
    'آرایشی و بهداشتی': ['آرایشی', 'بهداشتی', 'کرم', 'عطر', 'ادکلن', 'شامپو', 'پوست', 'مو', 'ضد آفتاب', 'صابون', 'رژ', 'سرم', 'تونر'],
    'ورزش و سفر': ['ورزش', 'چمدان', 'کوله', 'قمقمه', 'تردمیل', 'دوچرخه', 'شنا', 'طناب', 'مت یوگا', 'دمبل'],
    'ابزار آلات و تجهیزات': ['ابزار', 'دریل', 'پیچ', 'آچار', 'متر', 'انبردست', 'اره', 'پیچ گوشتی', 'کارواش'],
    'خودرو و موتورسیکلت': ['خودرو', 'ماشین', 'موتور', 'پخش خودرو', 'روکش صندلی', 'روغن موتور', 'کفپوش خودرو', 'تایر', 'لاستیک'],
    'محصولات بومی و محلی': ['زعفران', 'عسل', 'خشکبار', 'محلی', 'زرشک', 'صنایع دستی'],
    'کالاهای سوپرمارکتی': ['روغن', 'برنج', 'رب', 'ماکارونی', 'تنقلات', 'شکلات', 'چای', 'قهوه', 'نوشیدنی', 'کنسرو', 'شوینده', 'مایع ظرفشویی']
}

def guess_main_category(cat_title: str, title_fa: str) -> str:
    text = f"{cat_title or ''} {title_fa or ''}".lower()
    for main_cat, kws in MAIN_CATEGORY_KEYWORDS.items():
        for kw in kws:
            if kw in text:
                return main_cat
    return cat_title or 'سایر'

def extract_image_url(p: dict) -> str:
    images = p.get('images')
    if isinstance(images, dict):
        main = images.get('main')
        if isinstance(main, dict):
            url = main.get('url')
            if isinstance(url, list) and url:
                return str(url[0])
            elif isinstance(url, str):
                return url
        elif isinstance(main, str):
            return main
        elif isinstance(main, list) and main:
            return str(main[0])
    elif isinstance(images, str):
        return images
    elif isinstance(images, list) and images:
        first = images[0]
        if isinstance(first, str):
            return first
        elif isinstance(first, dict):
            return str(first.get('url', ''))
    return ''

def compute_fallback_verdict(p_raw: dict):
    price_info = p_raw.get('default_variant', {}).get('price', {})
    selling = price_info.get('selling_price', 0)
    rrp = price_info.get('rrp_price', selling)
    discount = price_info.get('discount_percent', 0)
    min_last_month = p_raw.get('properties', {}).get('min_price_in_last_month', 0)
    has_best = p_raw.get('default_variant', {}).get('has_best_price_in_last_month', False)

    min_30d = min_last_month if min_last_month > 0 else selling

    if has_best or (min_last_month > 0 and selling <= min_last_month):
        verdict = 'REAL_GREAT'
        label = 'تخفیف واقعی (کف قیمت ماه)'
        color = 'green'
        score = 92
        reason = 'قیمت فعلی کالا در کمترین رقم ثبت‌شده ۳۰ روز گذشته قرار دارد.'
    elif min_last_month > 0 and selling > min_last_month * 1.05:
        verdict = 'FAKE_UNCHANGED'
        label = 'تخفیف صوری (گران‌تر از کف ماه)'
        color = 'orange'
        score = 35
        diff = round(((selling - min_last_month) / min_last_month) * 100)
        reason = f'این کالا در ۳۰ روز گذشته با قیمت پایین‌تری عرضه شده بود ({diff}٪ گران‌تر از کف).'
    elif discount >= 30:
        verdict = 'REAL_MODERATE'
        label = 'تخفیف منصفانه'
        color = 'emerald'
        score = 75
        reason = f'تخفیف مناسب {discount} درصدی نسبت به قیمت پایه محصول.'
    elif discount > 0:
        verdict = 'NEUTRAL'
        label = 'تخفیف جزئی'
        color = 'blue'
        score = 55
        reason = f'تخفیف متداول {discount} درصدی دیجی‌کالا.'
    else:
        verdict = 'NEUTRAL'
        label = 'بدون تخفیف'
        color = 'blue'
        score = 50
        reason = 'تخفیفی برای این محصول اعمال نشده است.'

    return {
        'verdict': verdict,
        'verdict_label': label,
        'verdict_color': color,
        'score': score,
        'reason': reason,
        'min_30d': min_30d,
        'max_30d': rrp,
        'avg_30d': round((selling + rrp) / 2),
        'price_diff_30d_min': selling - min_30d,
        'price_diff_percent': discount,
        'is_all_time_low': has_best,
        'rrp_inflated': False,
    }

def analyze_discount(selling_price: int, rrp_price: int, discount_percent: int, history: list):
    if not history or len(history) == 0:
        return None

    sorted_history = sorted(history, key=lambda x: x.get('day', ''))
    sell_prices = [p.get('selling_price', 0) for p in sorted_history if p.get('selling_price', 0) > 0]
    if not sell_prices:
        return None

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

def format_product_item(p: dict, offer_key: str, offer_title: str, main_cat_id=None, main_cat_title=None):
    pid = p.get('id')
    price_info = p.get('default_variant', {}).get('price', {})
    selling = price_info.get('selling_price', 0)
    rrp = price_info.get('rrp_price', selling)
    discount = price_info.get('discount_percent', 0)

    main_img = extract_image_url(p)

    cat_title = p.get('category_title') or p.get('data_layer', {}).get('item_category2') or 'سایر'
    cat_id = p.get('category_id') or (p.get('category', {}).get('id') if isinstance(p.get('category'), dict) else None)
    url_uri = p.get('url', {}).get('uri', f"/product/dkp-{pid}/")

    resolved_main_title = main_cat_title or guess_main_category(cat_title, p.get('title_fa', ''))

    return {
        'id': pid,
        'title_fa': p.get('title_fa', ''),
        'title_en': p.get('title_en', ''),
        'image': main_img,
        'selling_price': selling,
        'rrp_price': rrp,
        'discount_percent': discount,
        'rating': p.get('rating', {}).get('rate', 0) if isinstance(p.get('rating'), dict) else 0,
        'rating_count': p.get('rating', {}).get('count', 0) if isinstance(p.get('rating'), dict) else 0,
        'category_id': cat_id,
        'category_title': cat_title,
        'main_category_id': main_cat_id,
        'main_category_title': resolved_main_title,
        'url': f"https://www.digikala.com{url_uri}",
        'offer_type': offer_key,
        'offer_type_title': offer_title,
        'has_chart': False,
        'analysis': compute_fallback_verdict(p),
    }

def fetch_single_chart(session: requests.Session, pid: int):
    url = PRICE_CHART_URL_TEMPLATE.format(product_id=pid)
    try:
        r = session.get(url, headers=HEADERS_WEB, timeout=7)
        if r.status_code == 200:
            data = r.json()
            pc = data.get('data', {}).get('price_chart', [])
            history = []
            if isinstance(pc, list):
                for item in pc:
                    if isinstance(item, dict) and 'history' in item and len(item['history']) > 0:
                        history = item['history']
                        break
            return pid, history
        elif r.status_code in (400, 429):
            time.sleep(0.5)
    except Exception:
        pass
    return pid, []

def main():
    print("🚀 Starting Complete Digikala Offers Collector & Analyzer...", flush=True)
    start_time = time.time()
    session = requests.Session()

    # 1. Fetch Landing Page Data from api.digikala.com (returns main_categories + initial offer buckets)
    print("📥 1. Fetching Main Categories & Landing Sections from Digikala...", flush=True)
    main_categories = []
    landing_raw = {}
    try:
        l_res = session.get(DIGIKALA_LANDING_URL, headers=HEADERS_WEB, timeout=12)
        if l_res.status_code == 200:
            landing_raw = l_res.json().get('data', {})
            main_categories = landing_raw.get('main_categories', [])
            print(f"✅ Received {len(main_categories)} Main Categories!", flush=True)
    except Exception as e:
        print(f"⚠️ Error fetching landing data: {e}", flush=True)

    # 2. Fetch Category-Specific Products for each of the 17 main categories
    print("📥 2. Fetching category-specific incredible products for each Main Category...", flush=True)
    category_product_map = {} # pid -> (cat_id, cat_title)
    landing_cat_products = []

    for c in main_categories:
        cid = c.get('id')
        ctitle = c.get('title')
        if not cid:
            continue
        try:
            c_url = f"https://api.digikala.com/v1/incredible-offers/?category_id={cid}"
            c_res = session.get(c_url, headers=HEADERS_WEB, timeout=10)
            if c_res.status_code == 200:
                c_data = c_res.json().get('data', {})
                count = 0
                for k, v in c_data.items():
                    if isinstance(v, dict) and 'products' in v:
                        for p in v.get('products', []):
                            pid = p.get('id')
                            if pid:
                                category_product_map[pid] = (cid, ctitle)
                                landing_cat_products.append(p)
                                count += 1
                print(f"  -> '{ctitle}' (ID {cid}): {count} products tagged", flush=True)
            time.sleep(0.05)
        except Exception as e:
            print(f"  -> Category '{ctitle}' fetch error: {e}", flush=True)

    # 3. Fetch Full Paginated Catalog from Sirius (All ~880 products)
    print("📥 3. Fetching full paginated catalog from Sirius Gateway...", flush=True)
    all_raw_products = []
    seen_ids = set()

    # Pre-add landing products
    for p in landing_cat_products:
        pid = p.get('id')
        if pid and pid not in seen_ids:
            seen_ids.add(pid)
            all_raw_products.append(p)

    # Fetch page 1
    try:
        p1_res = session.get(SIRIUS_PAGINATED_URL.format(page=1), headers=HEADERS_ANDROID, timeout=12)
        if p1_res.status_code == 200:
            p1_json = p1_res.json().get('data', {})
            total_pages = p1_json.get('pager', {}).get('total_pages', 44)
            for p in p1_json.get('products', []):
                pid = p.get('id')
                if pid and pid not in seen_ids:
                    seen_ids.add(pid)
                    all_raw_products.append(p)
            print(f"✅ Page 1 loaded: Total pages indicated: {total_pages}", flush=True)
        else:
            total_pages = 44
    except Exception as e:
        print(f"⚠️ Page 1 error: {e}", flush=True)
        total_pages = 44

    for page in range(2, min(total_pages + 1, 45)):
        try:
            url = SIRIUS_PAGINATED_URL.format(page=page)
            res = session.get(url, headers=HEADERS_ANDROID, timeout=10)
            if res.status_code == 200:
                prods = res.json().get('data', {}).get('products', [])
                if not prods:
                    break
                for p in prods:
                    pid = p.get('id')
                    if pid and pid not in seen_ids:
                        seen_ids.add(pid)
                        all_raw_products.append(p)
                print(f"  -> Page {page}: Total unique: {len(seen_ids)}", flush=True)
            time.sleep(0.05)
        except Exception as e:
            print(f"  -> Page {page} error: {e}", flush=True)

    print(f"🎉 Total unique incredible products collected: {len(all_raw_products)}", flush=True)

    # 4. Map products and populate Offer Categories (Tabs)
    product_dict = {}
    offer_category_products = {k: [] for k in OFFER_CATEGORY_KEYS.keys()}

    for p in all_raw_products:
        pid = p.get('id')
        main_cid, main_ctitle = category_product_map.get(pid, (None, None))
        item = format_product_item(p, 'all_offers_list', OFFER_CATEGORY_KEYS['all_offers_list']['title'], main_cid, main_ctitle)
        product_dict[pid] = item
        offer_category_products['all_offers_list'].append(item)

        # Categorize into specialized tabs based on deal flags
        price_info = p.get('default_variant', {}).get('price', {})
        is_inc = price_info.get('is_incredible', True)
        is_lightening = price_info.get('is_lightening_deal', False) or p.get('is_lightening_deal', False)
        is_digiplus = price_info.get('is_digiplus_promotion', False) or price_info.get('is_digiplus_early_access', False)
        cat_title = (item.get('category_title') or '').lower()
        main_title = (item.get('main_category_title') or '').lower()
        is_fresh = 'سوپرمارکت' in cat_title or 'سوپرمارکت' in main_title or 'خوراکی' in cat_title

        if is_inc:
            offer_category_products['incredible_products_list'].append(item)
        if is_lightening:
            offer_category_products['lightening_deal_products'].append(item)
        if is_digiplus:
            offer_category_products['digiplus_incredible_products'].append(item)
        if is_fresh:
            offer_category_products['fresh_incredible_products'].append(item)

    # Populate from landing raw groups as well
    for key in ['deal_of_the_day_products', 'lightening_deal_products', 'running_out_incredible_products', 'fresh_incredible_products', 'digiplus_incredible_products']:
        group = landing_raw.get(key, {})
        raw_list = group.get('products', []) if isinstance(group, dict) else []
        for p in raw_list:
            pid = p.get('id')
            if pid in product_dict:
                existing_item = product_dict[pid]
                if existing_item not in offer_category_products[key]:
                    offer_category_products[key].append(existing_item)
            else:
                main_cid, main_ctitle = category_product_map.get(pid, (None, None))
                item = format_product_item(p, key, OFFER_CATEGORY_KEYS[key]['title'], main_cid, main_ctitle)
                product_dict[pid] = item
                offer_category_products['all_offers_list'].append(item)
                offer_category_products[key].append(item)

    # If deal_of_the_day is empty, pick top-rated products
    if len(offer_category_products['deal_of_the_day_products']) == 0:
        top_rated = sorted(product_dict.values(), key=lambda x: (x['rating'], x['discount_percent']), reverse=True)[:30]
        offer_category_products['deal_of_the_day_products'].extend(top_rated)

    # If running_out is empty, pick products with discount > 40%
    if len(offer_category_products['running_out_incredible_products']) == 0:
        hot_deals = sorted(product_dict.values(), key=lambda x: x['discount_percent'], reverse=True)[:30]
        offer_category_products['running_out_incredible_products'].extend(hot_deals)

    # Build offer_categories object
    offer_categories = {}
    for key, meta in OFFER_CATEGORY_KEYS.items():
        prods = offer_category_products.get(key, [])
        offer_categories[key] = {
            'key': key,
            'title': meta['title'],
            'badge': meta['badge'],
            'icon': meta['icon'],
            'count': len(prods),
            'products': prods,
        }
        print(f"📊 Tab '{meta['title']}': {len(prods)} products", flush=True)

    # 5. Concurrently fetch 30-day Price Charts
    print(f"📈 4. Fetching 30-day price charts for {len(product_dict)} products...", flush=True)
    all_pids = list(product_dict.keys())
    chart_success_count = 0

    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_pid = {executor.submit(fetch_single_chart, session, pid): pid for pid in all_pids}
        for future in as_completed(future_to_pid):
            pid = future_to_pid[future]
            try:
                ret_pid, history = future.result()
                if history and len(history) > 0:
                    chart_success_count += 1
                    prod = product_dict.get(ret_pid)
                    if prod:
                        selling = prod['selling_price']
                        rrp = prod['rrp_price']
                        discount = prod['discount_percent']
                        analysis = analyze_discount(selling, rrp, discount, history)
                        if analysis:
                            prod['analysis'] = analysis
                            prod['has_chart'] = True

                        chart_data = {
                            'product_id': ret_pid,
                            'title': prod['title_fa'],
                            'selling_price': selling,
                            'rrp_price': rrp,
                            'analysis': analysis,
                            'history': history,
                            'is_live': False,
                        }
                        chart_file = os.path.join(CHARTS_DIR, f"{ret_pid}.json")
                        with open(chart_file, 'w', encoding='utf-8') as cf:
                            json.dump(chart_data, cf, ensure_ascii=False)
            except Exception:
                pass

    print(f"✅ Price charts successfully saved: {chart_success_count}/{len(all_pids)}", flush=True)

    # 6. Compute Statistics
    stats = {
        'REAL_GREAT': 0,
        'REAL_MODERATE': 0,
        'FAKE_INFLATED': 0,
        'FAKE_UNCHANGED': 0,
        'FAKE_MORE_EXPENSIVE': 0,
        'NEUTRAL': 0,
        'UNKNOWN': 0,
        'real_deals_count': 0,
        'fake_deals_count': 0,
        'neutral_deals_count': 0,
        'great_deals_count': 0,
        'max_discount': 0,
    }

    for prod in product_dict.values():
        if prod['discount_percent'] > stats['max_discount']:
            stats['max_discount'] = prod['discount_percent']

        v = prod.get('analysis', {}).get('verdict', 'NEUTRAL')
        stats[v] = stats.get(v, 0) + 1
        if v == 'REAL_GREAT':
            stats['real_deals_count'] += 1
            stats['great_deals_count'] += 1
        elif v == 'REAL_MODERATE':
            stats['real_deals_count'] += 1
        elif v in ('FAKE_UNCHANGED', 'FAKE_INFLATED', 'FAKE_MORE_EXPENSIVE'):
            stats['fake_deals_count'] += 1
        else:
            stats['neutral_deals_count'] += 1

    # 7. Save Master JSON
    now = datetime.now()
    now_iso = now.isoformat()
    now_fa = now.strftime("%H:%M") + " - بروزرسانی خودکار"

    output_payload = {
        'last_updated': now_iso,
        'last_updated_fa': now_fa,
        'total_products': len(product_dict),
        'stats': stats,
        'main_categories': main_categories,
        'offer_categories': offer_categories,
    }

    master_file = os.path.join(PUBLIC_DATA_DIR, 'deals.json')
    with open(master_file, 'w', encoding='utf-8') as f:
        json.dump(output_payload, f, ensure_ascii=False, indent=2)

    elapsed = round(time.time() - start_time, 1)
    print(f"✨ Done in {elapsed}s! Saved master file to {master_file} ({len(product_dict)} products).", flush=True)

if __name__ == '__main__':
    main()
