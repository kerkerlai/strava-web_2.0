#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Strava 雲端爬蟲 (Supabase 寫入版 + DOM 隔離表格掃描與 Streams 權威解析)
"""

import os
import re
import time
import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta

# ==========================================
# Supabase 環境變數與設定
# ==========================================
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://yxkvbkfnlqwlybhmugki.supabase.co").strip().rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY", os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a3Zia2ZubHF3bHliaG11Z2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NDIyODYsImV4cCI6MjEwMjUxODI4Nn0.Jky4o080Gn9-prx-G0aj7dCl7rmA1dJWN3BZgkVmjwo")).strip()

SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

# ==========================================
# 輔助函式 (API 讀取)
# ==========================================
def load_heroes_from_supabase():
    url = f"{SUPABASE_URL}/rest/v1/heroes?select=*"
    try:
        r = requests.get(url, headers=SUPABASE_HEADERS, timeout=10)
        if r.status_code == 200:
            profiles = {}
            for h in r.json():
                sid = str(h.get("strava_id", "")).strip()
                if sid and re.match(r"^\d+$", sid):
                    profiles[sid] = h.get("name")
            print(f"👥 [Supabase] 成功載入 {len(profiles)} 位已綁定 Strava ID 的英雄選手：{list(profiles.values())}")
            return profiles
    except Exception as e:
        print(f"❌ 連線 Supabase 異常: {e}")
    return {}

def load_exclude_keywords_from_supabase():
    url = f"{SUPABASE_URL}/rest/v1/game_config?key=eq.exclude_keywords"
    try:
        r = requests.get(url, headers=SUPABASE_HEADERS, timeout=10)
        if r.status_code == 200:
            data = r.json()
            if data and "value" in data[0]:
                print(f"⚙️ [Supabase] 成功載入排除關鍵字設定")
                return data[0]["value"]
    except Exception as e:
        print(f"⚠️ 無法取得排除關鍵字: {e}")
    return ["羽球"]

def get_existing_activity_ids():
    url = f"{SUPABASE_URL}/rest/v1/activities?select=id"
    try:
        r = requests.get(url, headers=SUPABASE_HEADERS, timeout=10)
        if r.status_code == 200:
            ids = set(str(item["id"]) for item in r.json())
            print(f"📋 [Supabase] 資料庫現存 {len(ids)} 筆歷史活動紀錄")
            return ids
    except Exception as e:
        print(f"⚠️ 無法取得現存活動 ID: {e}")
    return set()

# ==========================================
# 輔助函式 (解析與數值處理)
# ==========================================
def parse_time_to_minutes(time_str):
    if not time_str: return 0.0
    time_str = time_str.strip()
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
    lower_name = act_name.lower()
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
        return max(int(round(c)), int(round(mins * 4.0)))
    except Exception:
        return int(round(float(duration_mins) * 4.5))

def safe_int(val, default=0):
    try: return int(float(val))
    except (ValueError, TypeError): return default

def safe_float(val, default=0.0):
    try: return float(val)
    except (ValueError, TypeError): return default

# ==========================================
# 爬蟲核心邏輯
# ==========================================
def scrape_strava_activities(cookie_str, athlete_profiles, exclude_keywords):
    if not athlete_profiles:
        print("⚠️ 目前無任何綁定 Strava ID 的選手，結束本次爬取。")
        return

    clean_cookie = cookie_str.strip()
    if clean_cookie and not clean_cookie.startswith("_strava4_session=") and "=" not in clean_cookie:
        clean_cookie = f"_strava4_session={clean_cookie}"

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Cookie': clean_cookie,
        'Accept-Language': 'en-US,en;q=0.9,zh-TW;q=0.8,zh;q=0.7',
        'X-Requested-With': 'XMLHttpRequest'
    }
    session = requests.Session()
    session.headers.update(headers)

    now = datetime.now()
    current_month = now.strftime("%Y%m")
    last_month = (now.replace(day=1) - timedelta(days=1)).strftime("%Y%m")
    months_to_check = [current_month, last_month]

    print("\n[DEBUG] 🚀 啟動「個人主頁直擊模式」(雙維度 + Streams 深度精確解析)...")
    activity_ownership = {}

    # ----------------------------------------------------
    # 階段 1：初階掃描，取得所有活動 ID (主頁 + 雙維度 API)
    # ----------------------------------------------------
    for ath_id, member_name in athlete_profiles.items():
        print(f"\n[DEBUG] 正在掃描 {member_name} 的專屬活動資料...")
        found_ids = []
        
        # 1. 主頁清單
        try:
            resp1 = session.get(f"https://www.strava.com/athletes/{ath_id}?num_entries=20", timeout=15)
            clean_text1 = resp1.text.replace('\\"', '"').replace('\\/', '/')
            home_matches = re.findall(r'(?:/activities/|Activity-|"activity_id":\s*|activity_id=)(\d{8,14})', clean_text1)
            found_ids.extend(home_matches)
        except Exception:
            pass
            
        # 2. 月度圖表 API (miles 與 hours 兩種視圖)
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
                
        time.sleep(1) # 保護機制，避免被鎖

    print(f"\n[DEBUG] 掃描完成！共獲取 {len(activity_ownership)} 筆活動 ID。")
    
    existing_ids = get_existing_activity_ids()
    new_activities_to_insert = []

    # ----------------------------------------------------
    # 階段 2：深度解析每一筆活動的實際數據 (DOM)
    # ----------------------------------------------------
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

        # --- 1. 活動名稱與關鍵字排除 ---
        act_name = "未知活動"
        h1_tag = act_soup.find('h1')
        if h1_tag and h1_tag.text.strip():
            act_name = h1_tag.text.strip()
        elif act_soup.title and act_soup.title.text.strip():
            parts = act_soup.title.text.strip().split(' - ')
            if len(parts) >= 1:
                act_name = parts[0].strip()

        if any(kw in act_name for kw in exclude_keywords if kw):
            print(f"[DEBUG]   🚫 略過：活動名稱包含黑名單關鍵字。")
            continue

        sport_type = detect_sport_type(act_name)

        # --- 2. 開始時間解析 (GMT+8 台灣時間) ---
        start_time_readable = "未知時間"
        time_element = act_soup.find('time')
        if time_element and time_element.get('datetime'):
            try:
                dt_utc = datetime.strptime(time_element.get('datetime').replace('Z', ''), "%Y-%m-%dT%H:%M:%S")
                # 轉成台灣時間並格式化給 Supabase (yyyy/mm/dd HH:MM:SS)
                start_time_readable = (dt_utc + timedelta(hours=8)).strftime("%Y/%m/%d %H:%M:%S")
            except Exception: pass
            
        if start_time_readable == "未知時間":       # ⬅️ 確保這裡結尾是 "未知時間": 
            m = re.search(r'(\d{1,2}:\d{2}\s+[AP]M)\s+on\s+[A-Za-z]+,\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})', act_soup.text)
            if m:
                try:
                    time_str = f"{m.group(1)} {m.group(2)}"
                    dt_parsed = datetime.strptime(time_str, "%I:%M %p %B %d, %Y")
                    start_time_readable = dt_parsed.strftime("%Y/%m/%d %H:%M:%S")
                except Exception: pass
        
        # 若各種方法都無法解析時間，改預設為現在時間
        if start_time_readable == "未知時間":       # ⬅️ 確保這裡也是 "未知時間":
            start_time_readable = datetime.now().strftime("%Y/%m/%d %H:%M:%S")
