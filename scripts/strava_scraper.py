#!/usr/bin/env python3
"""
鋼鐵英雄紀元 (Iron Heroes Era) - Strava 網頁爬蟲 (DOM 隔離 + Streams 深度精確解析)
Supports:
1. Dynamic config loading from data/crawler_config.json
2. Environment variables overrides for GitHub Actions
3. Dual-dimension scanning (miles & hours)
4. Streams heart rate / moving time authority parsing
5. Direct write into Google Sheet 'Rawdata'
"""

import requests
import json
import os
import re
import time
import sys
from bs4 import BeautifulSoup
from datetime import datetime, timedelta

# Try importing gspread & google-auth
try:
    import gspread
    from google.oauth2.service_account import Credentials
except ImportError:
    print("⚠️ 警告：尚未安裝 gspread 或 google-auth 套件。請執行：pip install gspread google-auth")

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(BASE_DIR, 'data', 'crawler_config.json')

def load_crawler_config():
    """Loads configuration dynamically from Web API, JSON file, or environment variables"""
    config = {
        "athleteProfiles": {
            "468395126": "Kerker",
            "972959242": "Calla",
            "449473529": "Naomi",
            "2029007949": "Weber",
            "822925839": "Mooooo",
            "387396829": "Moupower",
            "548067864": "Richardyoho"
        },
        "excludeKeywords": ["羽球", "不想抓的關鍵字"],
        "sheetUrl": "https://docs.google.com/spreadsheets/d/1gNr8ptE_zjIeZsliaEqddqp5xz3Ir0LT7AkLmnSh3pY/edit",
        "worksheetName": "Rawdata"
    }

    # 1. Try reading local crawler_config.json
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
                saved = json.load(f)
                config.update(saved)
        except Exception as e:
            print(f"⚠️ 讀取 {CONFIG_PATH} 失敗，使用預設配置: {e}")

    # 2. Try fetching live dynamic config from Vercel Web API
    web_api_urls = [
        os.environ.get('WEB_API_URL'),
        "https://strava-web-2-0.vercel.app/api/crawler/config",
        "https://strava-web_2.0.vercel.app/api/crawler/config"
    ]
    for api_url in web_api_urls:
        if not api_url: continue
        try:
            r = requests.get(api_url, timeout=5)
            if r.status_code == 200:
                web_cfg = r.json()
                if isinstance(web_cfg, dict) and 'athleteProfiles' in web_cfg:
                    config.update(web_cfg)
                    print(f"🌐 [動態配置] 成功從 Web 雲端 ({api_url}) 同步最新選手名單 (共 {len(config['athleteProfiles'])} 位選手)！")
                    break
        except Exception:
            pass

    # Environment variable overrides
    if os.environ.get('ATHLETE_PROFILES_JSON'):
        try:
            config['athleteProfiles'] = json.loads(os.environ.get('ATHLETE_PROFILES_JSON'))
        except Exception:
            pass

    if os.environ.get('EXCLUDE_KEYWORDS_JSON'):
        try:
            config['excludeKeywords'] = json.loads(os.environ.get('EXCLUDE_KEYWORDS_JSON'))
        except Exception:
            pass

    if os.environ.get('SHEET_URL'):
        config['sheetUrl'] = os.environ.get('SHEET_URL').strip()

    if os.environ.get('WORKSHEET_NAME'):
        config['worksheetName'] = os.environ.get('WORKSHEET_NAME').strip()

    return config

def get_env_var(var_name):
    val = os.environ.get(var_name, "").strip()
    if not val:
        print(f"❌ 警告：找不到環境變數【{var_name}】")
        return None
    return val

def setup_google_sheet(creds_json, sheet_url, worksheet_name, config_obj=None):
    try:
        creds_dict = json.loads(creds_json)
        scope = [
            "https://spreadsheets.google.com/feeds",
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive"
        ]
        creds = Credentials.from_service_account_info(creds_dict, scopes=scope)
        client = gspread.authorize(creds)
        spreadsheet = client.open_by_url(sheet_url)
        print(f"✅ 成功連線至 Google Sheets：{spreadsheet.title}")

        # Auto-discover Strava IDs from 參賽者名單 tab
        if config_obj and isinstance(config_obj, dict) and "athleteProfiles" in config_obj:
            try:
                p_ws = spreadsheet.worksheet("參賽者名單")
                p_rows = p_ws.get_all_values()
                sheet_added = 0
                for row in p_rows[1:]:
                    if len(row) >= 2 and row[0].strip():
                        name = row[0].strip()
                        # Search for Strava ID in all columns of the row
                        for cell in row[1:]:
                            cell_str = str(cell).strip()
                            if re.match(r"^\d{6,12}$", cell_str):
                                if cell_str not in config_obj["athleteProfiles"]:
                                    config_obj["athleteProfiles"][cell_str] = name
                                    sheet_added += 1
                                    print(f"📋 [Google Sheet 名冊同步] 自動發現新選手：{name} (Strava ID: #{cell_str})")
                                break
                if sheet_added > 0:
                    print(f"🎉 從 Google Sheet 參賽者名單成功載入 {sheet_added} 位新選手！目前總共監控 {len(config_obj['athleteProfiles'])} 位選手。")
            except Exception as pe:
                print(f"ℹ️ 掃描「參賽者名單」Strava ID: {pe}")

        return spreadsheet.worksheet(worksheet_name)
    except Exception as e:
        print(f"❌ Google Sheets 連線失敗：{e}")
        return None

def parse_time_to_minutes(time_str):
    if not time_str: return 0.0
    time_str = str(time_str).strip()
    if 'h' in time_str.lower() or 'm' in time_str.lower() or 's' in time_str.lower():
        h = int(re.search(r'(\d+)\s*h', time_str, re.I).group(1)) if re.search(r'(\d+)\s*h', time_str, re.I) else 0
        m = int(re.search(r'(\d+)\s*m', time_str, re.I).group(1)) if re.search(r'(\d+)\s*m', time_str, re.I) else 0
        s = int(re.search(r'(\d+)\s*s', time_str, re.I).group(1)) if re.search(r'(\d+)\s*s', time_str, re.I) else 0
        return round(h * 60 + m + s / 60.0, 1)

    parts = time_str.split(':')
    if len(parts) == 3:
        try: return round(int(parts[0]) * 60 + int(parts[1]) + float(parts[2]) / 60.0, 1)
        except ValueError: pass
    elif len(parts) == 2:
        try: return round(int(parts[0]) + float(parts[1]) / 60.0, 1)
        except ValueError: pass
    return 0.0

def detect_sport_type(act_name):
    lower_name = str(act_name).lower()
    if any(k in lower_name for k in ["ride", "cycling", "bike", "騎車", "單車", "自行車", "騎行", "公路車"]):
        return "Ride"
    if any(k in lower_name for k in ["run", "running", "jog", "跑步", "路跑", "晨跑", "夜跑", "慢跑", "間歇跑"]):
        return "Run"
    if any(k in lower_name for k in ["weight", "lifting", "strength", "gym", "重量訓練", "重訓", "力量訓練", "健身", "胸", "背", "腿"]):
        return "WeightTraining"
    if any(k in lower_name for k in ["walk", "walking", "hike", "hiking", "步行", "健走", "散步", "爬山", "登山", "健行"]):
        return "Walk"
    if any(k in lower_name for k in ["swim", "swimming", "游泳"]):
        return "Swim"
    return "Workout"

def calculate_calories(avg_hr, duration_mins):
    try:
        hr = float(avg_hr)
        mins = float(duration_mins)
        c = ((-59.0 + (0.45 * hr) + (0.074 * 55) + (0.274 * 34)) / 4.184) * mins
        return str(max(int(round(c)), int(round(mins * 4.0))))
    except Exception:
        return str(int(round(float(duration_mins) * 4.5)))

def run_scraper(worksheet, cookie_str, athlete_profiles, exclude_keywords):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Cookie': f'_strava4_session={cookie_str}' if '_strava4_session=' not in cookie_str else cookie_str,
        'Accept-Language': 'en-US,en;q=0.9,zh-TW;q=0.8,zh;q=0.7',
        'X-Requested-With': 'XMLHttpRequest'
    }
    session = requests.Session()
    session.headers.update(headers)

    print("\n[DEBUG] 🚀 啟動「個人主頁直擊模式」(雙維度 + Streams 深度精確解析)...")
    
    activity_ownership = {}
    
    now = datetime.now()
    current_month = now.strftime("%Y%m")
    first_day_of_current = now.replace(day=1)
    last_month = (first_day_of_current - timedelta(days=1)).strftime("%Y%m")
    months_to_check = [current_month, last_month]

    # ----------------------------------------------------
    # 階段 1：掃描活動清單 (主頁 20 筆 + miles/hours 雙維度 API)
    # ----------------------------------------------------
    for ath_id, member_name in athlete_profiles.items():
        print(f"\n[DEBUG] 正在掃描 {member_name} (ID: {ath_id}) 的專屬活動資料...")
        found_ids = []
        
        # 1. 主頁清單
        try:
            resp1 = session.get(f"https://www.strava.com/athletes/{ath_id}?num_entries=20", timeout=15)
            clean_text1 = resp1.text.replace('\\"', '"').replace('\\/', '/')
            home_matches = re.findall(r'(?:/activities/|Activity-|"activity_id":\s*|activity_id=)(\d{8,14})', clean_text1)
            found_ids.extend(home_matches)
            print(f"[DEBUG]   👉 主頁清單找到 {len(set(home_matches))} 筆活動")
        except Exception as e:
            print(f"[DEBUG]   讀取主頁異常：{e}")
            
        # 2. 月度圖表 API (miles 與 hours)
        for yyyymm in months_to_check:
            for c_type in ["miles", "hours"]:
                try:
                    api_url = f"https://www.strava.com/athletes/{ath_id}/interval?interval={yyyymm}&interval_type=month&chart_type={c_type}&year_offset=0"
                    resp_api = session.get(api_url, timeout=15)
                    clean_api = resp_api.text.replace('\\"', '"').replace('\\/', '/')
                    api_matches = re.findall(r'(?:/activities/|Activity-|"activity_id":\s*|activity_id=)(\d{8,14})', clean_api)
                    found_ids.extend(api_matches)
                except Exception:
                    pass
            
        for act_id in set(found_ids):
            if act_id not in activity_ownership:
                activity_ownership[act_id] = member_name
                
        time.sleep(1)

    print(f"\n[DEBUG] 掃描完成！從名單中共獲取 {len(activity_ownership)} 筆活動 ID。")
    print("--------------------------------------------------")

    try:
        existing_ids = [str(val).strip() for val in worksheet.col_values(1) if val]
    except Exception as e:
        print(f"讀取現有 ID 失敗：{e}")
        existing_ids = []

    # ----------------------------------------------------
    # 階段 2：深度解析個別活動數據
    # ----------------------------------------------------
    added_count = 0
    for act_id, member_name in activity_ownership.items():
        if str(act_id) in existing_ids:
            continue

        print(f"\n[DEBUG] ▶️ 開始處理活動 ID:{act_id} | 擁有者:{member_name}")
        act_url = f"https://www.strava.com/activities/{act_id}"
        try:
            act_resp = session.get(act_url, timeout=15)
        except Exception as e:
            print(f"[DEBUG]   ❌ 活動頁面請求失敗: {e}")
            continue

        act_soup = BeautifulSoup(act_resp.text, 'html.parser')

        # --- 1. 活動名稱與黑名單過濾 ---
        act_name = "未知活動"
        h1_tag = act_soup.find('h1')
        if h1_tag and h1_tag.text.strip():
            act_name = h1_tag.text.strip()
        elif act_soup.title and act_soup.title.text.strip():
            parts = act_soup.title.text.strip().split(' - ')
            if len(parts) >= 1:
                act_name = parts[0].strip()

        if any(kw in act_name for kw in exclude_keywords):
            print(f"[DEBUG]   🚫 略過：活動名稱包含黑名單關鍵字。")
            continue

        sport_type = detect_sport_type(act_name)

        # --- 2. 開始時間解析 (GMT+8 台灣時間) ---
        start_time_readable = "未知時間"
        time_element = act_soup.find('time')
        if time_element and time_element.get('datetime'):
            try:
                dt_utc = datetime.strptime(time_element.get('datetime').replace('Z', ''), "%Y-%m-%dT%H:%M:%S")
                dt = dt_utc + timedelta(hours=8)
                ampm = "上午" if dt.hour < 12 else "下午"
                hour12 = 12 if dt.hour % 12 == 0 else dt.hour % 12
                start_time_readable = f"{dt.year}/{dt.month}/{dt.day} {ampm} {hour12}:{dt.strftime('%M:%S')}"
            except Exception: pass
            
        if start_time_readable == "未知時間":
            m = re.search(r'(\d{1,2}:\d{2}\s+[AP]M)\s+on\s+[A-Za-z]+,\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})', act_soup.text)
            if m:
                try:
                    time_str = f"{m.group(1)} {m.group(2)}"
                    dt = datetime.strptime(time_str, "%I:%M %p %B %d, %Y")
                    ampm = "上午" if dt.hour < 12 else "下午"
                    hour12 = 12 if dt.hour % 12 == 0 else dt.hour % 12
                    start_time_readable = f"{dt.year}/{dt.month}/{dt.day} {ampm} {hour12}:{dt.strftime('%M:%S')}"
                except Exception: pass

        # --- 3. DOM 標籤精確解析 ---
        moving_time_mins = ""
        avg_heartrate = ""
        max_heartrate = ""
        calories = ""
        distance_km = ""
        elevation_m = ""

        # A. 從 ul.inline-stats 提取時長與距離 (徹底隔離配速 Pace)
        stats_ul = act_soup.find('ul', class_=re.compile(r'inline-stats', re.I))
        if stats_ul:
            for li in stats_ul.find_all('li'):
                strong = li.find(['strong', 'b'])
                if not strong: continue
                val = strong.text.strip()
                li_txt = li.text.strip().lower()
                if 'moving time' in li_txt:
                    moving_time_mins = parse_time_to_minutes(val)
                elif 'distance' in li_txt:
                    d_m = re.search(r'([\d\.]+)', val)
                    if d_m: distance_km = d_m.group(1)

        # B. 從表格提取心率、最大心率與原生卡路里
        for tr in act_soup.find_all('tr'):
            tr_text = tr.text.lower()
            if 'heart rate' in tr_text or '心率' in tr_text:
                bpms = re.findall(r'(\d+)\s*bpm', tr.text)
                if len(bpms) >= 2:
                    avg_heartrate, max_heartrate = bpms[0], bpms[1]
                elif len(bpms) == 1 and not avg_heartrate:
                    avg_heartrate = bpms[0]
            if not calories and ('cal' in tr_text or '熱量' in tr_text):
                c_m = re.search(r'(\d+)', tr.text)
                if c_m:
                    calories = c_m.group(1)

        # --- 4. Streams 數據流核實與補充 (權威秒級來源) ---
        if not avg_heartrate or not max_heartrate or not moving_time_mins or not calories:
            try:
                streams_url = f"https://www.strava.com/activities/{act_id}/streams?stream_types%5B%5D=heartrate&stream_types%5B%5D=time&stream_types%5B%5D=distance"
                s_resp = session.get(streams_url, timeout=10)
                if s_resp.status_code == 200:
                    s_data = s_resp.json()
                    hr_list = s_data.get('heartrate', [])
                    time_list = s_data.get('time', [])
                    dist_list = s_data.get('distance', [])

                    if hr_list and not avg_heartrate:
                        avg_heartrate = str(round(sum(hr_list) / len(hr_list)))
                    if hr_list and not max_heartrate:
                        max_heartrate = str(max(hr_list))
                    if time_list and not moving_time_mins:
                        moving_time_mins = round(time_list[-1] / 60.0, 1)
                    if dist_list and not distance_km:
                        distance_km = str(round(dist_list[-1] / 1000.0, 2))
                    print(f"[DEBUG]   📡 Streams 還原 -> 時長: {moving_time_mins}分, 平均HR: {avg_heartrate}, 最大HR: {max_heartrate}")
            except Exception as e:
                print(f"[DEBUG]   Streams 讀取異常: {e}")

        # --- 5. 自動熱量推算 (若前台與後台皆未提供) ---
        if not calories and avg_heartrate and moving_time_mins:
            calories = calculate_calories(avg_heartrate, moving_time_mins)
            print(f"[DEBUG]   🔥 依心率自動推算熱量: {calories} kcal")

        print(f"[DEBUG]   👉 最終結果 -> 項目:{sport_type} | 時長:{moving_time_mins}分 | 距離:{distance_km}km | 平均HR:{avg_heartrate} | 最大HR:{max_heartrate} | 熱量:{calories} kcal")

        if not moving_time_mins or not avg_heartrate:
            print(f"[DEBUG]   ⚠️ 捨棄：缺少必要時長或心率 (Time: {moving_time_mins}, Avg HR: {avg_heartrate})")
            continue

        # --- 6. 寫入 Google Sheet ---
        row_data = [
            str(act_id),
            member_name,
            start_time_readable,
            sport_type,
            act_name,
            moving_time_mins,
            distance_km,
            elevation_m,
            avg_heartrate,
            max_heartrate,
            "",
            calories
        ]
        
        try:
            worksheet.append_row(row_data)
            added_count += 1
            print(f"✅ 成功寫入：{member_name} | {sport_type} - {act_name} | {moving_time_mins}分 | HR:{avg_heartrate} | {calories}卡")
        except Exception as e:
            print(f"❌ 寫入 Google Sheet 失敗：{e}")

        time.sleep(2)

    print(f"\n🎉 爬蟲執行完畢！本次共新增 {added_count} 筆活動至 Google Sheet。")

if __name__ == "__main__":
    print("=== Strava 網頁爬蟲精準版 (DOM 隔離 + Streams 權威解析) 啟動 ===")
    
    cfg = load_crawler_config()
    GOOGLE_CREDS_JSON = get_env_var('GOOGLE_SHEETS_CREDENTIALS')
    STRAVA_COOKIE = get_env_var('STRAVA_COOKIE')

    if not all([GOOGLE_CREDS_JSON, STRAVA_COOKIE]):
        print("❌ 核心環境變數缺失 (GOOGLE_SHEETS_CREDENTIALS / STRAVA_COOKIE)，請確認後再執行。")
        sys.exit(1)

    ws = setup_google_sheet(GOOGLE_CREDS_JSON, cfg['sheetUrl'], cfg['worksheetName'], cfg)
    if ws:
        run_scraper(ws, STRAVA_COOKIE, cfg['athleteProfiles'], cfg['excludeKeywords'])
