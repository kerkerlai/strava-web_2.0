#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Strava 雲端爬蟲 (Supabase 雲端資料庫 100% 動態直連版 + React Microfrontend 支援)
"""

import os
import re
import time
import sys
import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://yxkvbkfnlqwlybhmugki.supabase.co").strip().rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY", os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a3Zia2ZubHF3bHliaG11Z2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NDIyODYsImV4cCI6MjEwMjUxODI4Nn0.Jky4o080Gn9-prx-G0aj7dCl7rmA1dJWN3BZgkVmjwo")).strip()

SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

def load_heroes_from_supabase():
    """從 Supabase heroes 表動態取得所有冒險者及其 Strava 數字 ID (完全無 Hardcode)"""
    url = f"{SUPABASE_URL}/rest/v1/heroes?select=*"
    try:
        r = requests.get(url, headers=SUPABASE_HEADERS, timeout=10)
        if r.status_code == 200:
            heroes_list = r.json()
            profiles = {}
            for h in heroes_list:
                sid = str(h.get("strava_id", "")).strip()
                if sid and re.match(r"^\d+$", sid):
                    profiles[sid] = h.get("name")
            print(f"👥 [Supabase] 成功載入 {len(profiles)} 位已綁定 Strava ID 的英雄選手：{list(profiles.values())}")
            return profiles
        else:
            print(f"❌ 讀取 Supabase heroes 失敗 (HTTP {r.status_code}): {r.text}")
    except Exception as e:
        print(f"❌ 連線 Supabase 異常: {e}")
    return {}

def load_exclude_keywords_from_supabase():
    """從 Supabase game_config 表動態取得排除關鍵字"""
    url = f"{SUPABASE_URL}/rest/v1/game_config?key=eq.exclude_keywords"
    try:
        r = requests.get(url, headers=SUPABASE_HEADERS, timeout=10)
        if r.status_code == 200:
            data = r.json()
            if data and "value" in data[0]:
                kws = data[0]["value"]
                print(f"⚙️ [Supabase] 成功載入排除關鍵字設定：{kws}")
                return kws
    except Exception as e:
        print(f"⚠️ 無法取得排除關鍵字: {e}")
    return ["羽球"]

def get_existing_activity_ids():
    """從 Supabase activities 表取得所有現存活動 ID，避免重複寫入"""
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

def calculate_calories(avg_hr, duration_mins):
    try:
        hr = float(avg_hr)
        dur = float(duration_mins)
        cal = ((-55.0969 + (0.6309 * hr) + (0.1988 * 70) + (0.2017 * 30)) / 4.184) * dur
        return str(max(10, round(cal)))
    except Exception:
        return ""

def scrape_strava_activities(strava_cookie, athlete_profiles, exclude_keywords):
    if not athlete_profiles:
        print("⚠️ 目前 Supabase 中無任何綁定 Strava ID 的選手，結束本次爬取。")
        return

    # 確保 Cookie 包含 _strava4_session
    clean_cookie = strava_cookie.strip()
    if clean_cookie and not clean_cookie.startswith("_strava4_session=") and "=" not in clean_cookie:
        clean_cookie = f"_strava4_session={clean_cookie}"

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Cookie": clean_cookie,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7"
    }

    existing_ids = get_existing_activity_ids()
    new_activities_to_insert = []

    print(f"🚀 開始動態爬取 {len(athlete_profiles)} 位選手的最新運動...")

    for ath_id, member_name in athlete_profiles.items():
        print(f"\n🔍 正在爬取選手：{member_name} (Strava ID: #{ath_id})...")
        url = f"https://www.strava.com/athletes/{ath_id}"
        
        try:
            resp = requests.get(url, headers=headers, timeout=15)
            if resp.status_code != 200:
                print(f"  ❌ 連線失敗 (HTTP {resp.status_code})")
                continue

            soup = BeautifulSoup(resp.text, "html.parser")
            found_athlete_acts = []

            # 1. 解析 Strava 現代 Microfrontend React Prefetched Feed
            for comp in soup.select("[data-react-class=Microfrontend]"):
                props_raw = comp.get("data-react-props")
                if not props_raw: continue
                try:
                    p_data = json.loads(props_raw)
                    app_ctx = p_data.get("appContext", {})
                    pre_entries = app_ctx.get("preFetchedEntries", [])
                    for entry in pre_entries:
                        act = entry.get("activity")
                        if not act: continue
                        act_ath_id = str(act.get("athlete", {}).get("athleteId", ""))
                        if act_ath_id == str(ath_id) or not act_ath_id:
                            act_id = str(act.get("id"))
                            if act_id and act_id not in existing_ids:
                                found_athlete_acts.append((act_id, act.get("activityName") or "鍛鍊", act))
                except Exception:
                    pass

            # 2. 若無 React Prefetched，嘗試解析傳統 HTML 卡片
            if not found_athlete_acts:
                activity_cards = soup.select("div.activity, div.feed-entry, div[data-testid=web-feed-entry], div.card, article")
                for card in activity_cards:
                    act_link = card.select_one("a[href*='/activities/']")
                    if act_link:
                        m = re.search(r"/activities/(\d+)", act_link.get("href", ""))
                        if m:
                            act_id = str(m.group(1))
                            if act_id not in existing_ids:
                                name_el = card.select_one(".entry-title, .activity-name, [data-testid=activity_name]")
                                found_athlete_acts.append((act_id, name_el.text.strip() if name_el else "鍛鍊", None))

            print(f"  📡 成功解析出 {len(found_athlete_acts)} 筆新運動")

            for act_id, act_name, react_act in found_athlete_acts:
                if act_id in existing_ids:
                    continue

                # Check Excluded Keywords
                if any(kw in act_name for kw in exclude_keywords if kw):
                    print(f"  🚫 略過排除關鍵字活動：{act_name} (#{act_id})")
                    continue

                sport_type = "Workout"
                moving_time_mins = 0
                distance_km = 0
                elevation_m = 0
                avg_hr = 0
                max_hr = 0
                calories = 0
                start_time_readable = None

                # 若有 React 預載資料，優先提取
                if react_act:
                    sport_type = react_act.get("type", "Workout")
                    elapsed = react_act.get("elapsedTime", 0)
                    if elapsed: moving_time_mins = round(elapsed / 60)
                    for st in react_act.get("stats", []):
                        val_str = st.get("value", "")
                        sub = st.get("key", "")
                        if "Time" in val_str or "stat_one" in sub:
                            m_min = re.search(r"(\d+)m", val_str)
                            m_hr = re.search(r"(\d+)h", val_str)
                            h = int(m_hr.group(1)) if m_hr else 0
                            m = int(m_min.group(1)) if m_min else 0
                            if h or m: moving_time_mins = h * 60 + m
                        elif "bpm" in val_str:
                            m_bpm = re.search(r"(\d+)", val_str)
                            if m_bpm: avg_hr = int(m_bpm.group(1))
                        elif "Cal" in val_str or "kcal" in val_str:
                            m_cal = re.search(r"([\d,]+)", val_str)
                            if m_cal: calories = int(m_cal.group(1).replace(",", ""))

                    if react_act.get("startDate"):
                        try:
                            clean_dt = react_act.get("startDate").replace("Z", "+00:00")
                            dt_obj = datetime.fromisoformat(clean_dt)
                            local_dt = dt_obj + timedelta(hours=8)
                            start_time_readable = local_dt.strftime("%Y/%m/%d %H:%M:%S")
                        except Exception:
                            pass

                # Fetch detailed activity page if needed
                detail_url = f"https://www.strava.com/activities/{act_id}"
                try:
                    detail_resp = requests.get(detail_url, headers=headers, timeout=15)
                    if detail_resp.status_code == 200:
                        d_soup = BeautifulSoup(detail_resp.text, "html.parser")
                        type_el = d_soup.select_one(".activity-type, .inline-stats")
                        if type_el and not sport_type:
                            sport_type = type_el.text.strip().split()[0]

                        stat_spans = d_soup.select(".inline-stats li, .stats li, [data-testid=stat]")
                        for li in stat_spans:
                            txt = li.text.strip()
                            if ("時間" in txt or "Time" in txt) and not moving_time_mins:
                                num = re.search(r"(\d+)\s*(?:小時|h|hr)?\s*(\d+)?\s*(?:分|m|min)?", txt)
                                if num:
                                    h = int(num.group(1)) if "小時" in txt or "h" in txt else 0
                                    mins = int(num.group(2) or num.group(1)) if h > 0 else int(num.group(1))
                                    moving_time_mins = h * 60 + mins
                            elif "距離" in txt or "Distance" in txt:
                                num = re.search(r"([\d\.]+)\s*(?:公里|km)", txt)
                                if num: distance_km = float(num.group(1))
                            elif ("心率" in txt or "Heart Rate" in txt or "bpm" in txt) and not avg_hr:
                                num = re.search(r"(\d+)\s*bpm", txt)
                                if num: avg_hr = int(num.group(1))
                            elif ("卡路里" in txt or "熱量" in txt or "Calories" in txt) and not calories:
                                num = re.search(r"([\d,]+)\s*(?:卡|kcal|Calories)", txt)
                                if num: calories = int(num.group(1).replace(",", ""))

                        time_el = d_soup.select_one("time, .timestamp, [data-testid=date_time]")
                        if time_el and not start_time_readable:
                            dt_attr = time_el.get("datetime", "")
                            if dt_attr:
                                try:
                                    clean_dt = dt_attr.replace("Z", "+00:00")
                                    dt_obj = datetime.fromisoformat(clean_dt)
                                    local_dt = dt_obj + timedelta(hours=8)
                                    start_time_readable = local_dt.strftime("%Y/%m/%d %H:%M:%S")
                                except Exception:
                                    pass
                            if not start_time_readable and time_el.text.strip():
                                start_time_readable = time_el.text.strip()
                except Exception as e:
                    pass

                if not calories and avg_hr and moving_time_mins:
                    calories = int(calculate_calories(avg_hr, moving_time_mins) or 0)

                if not start_time_readable:
                    start_time_readable = datetime.now().strftime("%Y/%m/%d %H:%M:%S")

                act_data = {
                    "id": act_id,
                    "hero": member_name,
                    "date": start_time_readable,
                    "type": sport_type,
                    "name": act_name,
                    "duration": moving_time_mins,
                    "distance": distance_km,
                    "elevation": elevation_m,
                    "avg_hr": avg_hr,
                    "max_hr": max_hr or (avg_hr + 20 if avg_hr else 0),
                    "calories": calories,
                    "is_manual": False,
                    "is_excluded": False
                }

                new_activities_to_insert.append(act_data)
                existing_ids.add(act_id)
                print(f"  ✨ 成功抓取新運動：{member_name} | {act_name} | 時間: {start_time_readable} | 時長: {moving_time_mins}分 | 平均心率: {avg_hr} bpm | 熱量: {calories}卡")

                time.sleep(1)

        except Exception as e:
            print(f"  ❌ 爬取選手 {member_name} 異常: {e}")

    # Write new activities to Supabase
    if new_activities_to_insert:
        print(f"\n💾 正在將 {len(new_activities_to_insert)} 筆新運動寫入 Supabase 資料庫...")
        insert_url = f"{SUPABASE_URL}/rest/v1/activities"
        try:
            r = requests.post(insert_url, headers=SUPABASE_HEADERS, json=new_activities_to_insert, timeout=15)
            if r.status_code in [200, 201]:
                print(f"🎉 成功寫入 {len(new_activities_to_insert)} 筆新運動至 Supabase！前台看板與世界 Boss 戰況已秒速同步！")
            else:
                print(f"❌ 寫入 Supabase 失敗 (HTTP {r.status_code}): {r.text}")
        except Exception as e:
            print(f"❌ 寫入 Supabase 發生錯誤: {e}")
    else:
        print("\n✅ 本次檢查無新活動寫入。")

if __name__ == "__main__":
    print("=== Strava 雲端爬蟲 (Supabase 雲端資料庫 100% 動態直連版) 啟動 ===")
    STRAVA_COOKIE = os.environ.get("STRAVA_COOKIE", "").strip()
    if not STRAVA_COOKIE:
        print("❌ 警告：未提供 STRAVA_COOKIE 環境變數，請在 GitHub Secrets 設定。")
    
    heroes = load_heroes_from_supabase()
    exclude_keywords = load_exclude_keywords_from_supabase()
    scrape_strava_activities(STRAVA_COOKIE, heroes, exclude_keywords)
