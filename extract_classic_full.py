import json

# Export complete 0717 Classic Season frozen data
classic_0717_data = {
  "seasonTitle": "0717 經典競技模式",
  "seasonPeriod": "2026/05/01 ~ 2026/07/01 (共 62 天)",
  "status": "completed",
  "statusLabel": "🏁 本賽季已圓滿結束 (數據已封存)",
  "champions": {
    "teamAerobic": [
      {"rank": 1, "name": "咪咪胡胡", "score": 100.0, "badge": "🥇"},
      {"rank": 2, "name": "Cake", "score": 61.89, "badge": "🥈"},
      {"rank": 3, "name": "嘿喲嘿喲拔蘿蔔", "score": 43.19, "badge": "🥉"},
      {"rank": 4, "name": "天琳琳地琳琳", "score": 5.54, "badge": ""}
    ],
    "heroAerobic": [
      {"rank": 1, "name": "Naomi", "guild": "咪咪胡胡", "score": 100.0, "badge": "🥇"},
      {"rank": 2, "name": "Kerker", "guild": "Cake", "score": 55.26, "badge": "🥈"},
      {"rank": 3, "name": "Mooooo", "guild": "嘿喲嘿喲拔蘿蔔", "score": 45.15, "badge": "🥉"},
      {"rank": 4, "name": "Calla", "guild": "Cake", "score": 14.3, "badge": ""},
      {"rank": 5, "name": "Weber", "guild": "咪咪胡胡", "score": 11.3, "badge": ""}
    ],
    "teamAnaerobic": [
      {"rank": 1, "name": "咪咪胡胡", "score": 90.04, "badge": "🥇"},
      {"rank": 2, "name": "Cake", "score": 83.62, "badge": "🥈"},
      {"rank": 3, "name": "嘿喲嘿喲拔蘿蔔", "score": 36.43, "badge": "🥉"},
      {"rank": 4, "name": "天琳琳地琳琳", "score": 4.92, "badge": ""}
    ],
    "heroAnaerobic": [
      {"rank": 1, "name": "Naomi", "guild": "咪咪胡胡", "score": 77.41, "badge": "🥇"},
      {"rank": 2, "name": "Calla", "guild": "Cake", "score": 70.74, "badge": "🥈"},
      {"rank": 3, "name": "Kerker", "guild": "Cake", "score": 55.26, "badge": "🥉"}
    ]
  },
  "teamMetrics": [
    {
      "metric": "🏋️ 鋼鐵紀律 (人均出勤)",
      "unit": "次",
      "leaderboard": [
        {"rank": "🥇 1", "team": "咪咪胡胡", "value": "17.0"},
        {"rank": "🥈 2", "team": "Cake", "value": "15.5"},
        {"rank": "🥉 3", "team": "嘿喲嘿喲拔蘿蔔", "value": "7.5"}
      ]
    },
    {
      "metric": "⏱️ 精神時光屋 (人均時長)",
      "unit": "分鐘",
      "leaderboard": [
        {"rank": "🥇 1", "team": "咪咪胡胡", "value": "891.0"},
        {"rank": "🥈 2", "team": "Cake", "value": "715.8"},
        {"rank": "🥉 3", "team": "嘿喲嘿喲拔蘿蔔", "value": "378.7"}
      ]
    },
    {
      "metric": "🔋 燃脂發電機 (人均熱量)",
      "unit": "kcal",
      "leaderboard": [
        {"rank": "🥇 1", "team": "咪咪胡胡", "value": "4,188"},
        {"rank": "🥈 2", "team": "Cake", "value": "3,518"},
        {"rank": "🥉 3", "team": "嘿喲嘿喲拔蘿蔔", "value": "1,805"}
      ]
    },
    {
      "metric": "🚀 引擎過載 (人均衝力 TRIMP)",
      "unit": "TRIMP",
      "leaderboard": [
        {"rank": "🥇 1", "team": "咪咪胡胡", "value": "2,101.5"},
        {"rank": "🥈 2", "team": "Cake", "value": "924.7"},
        {"rank": "🥉 3", "team": "嘿喲嘿喲拔蘿蔔", "value": "873.2"}
      ]
    },
    {
      "metric": "🟢 有氧大師 (人均有氧次數)",
      "unit": "次",
      "leaderboard": [
        {"rank": "🥇 1", "team": "咪咪胡胡", "value": "5.5"},
        {"rank": "🥈 2", "team": "Cake", "value": "3.5"},
        {"rank": "🥉 3", "team": "嘿喲嘿喲拔蘿蔔", "value": "2.5"}
      ]
    },
    {
      "metric": "🦍 絕對力量 (人均落差 Gap)",
      "unit": "bpm",
      "leaderboard": [
        {"rank": "🥇 1", "team": "Cake", "value": "649.9"},
        {"rank": "🥈 2", "team": "咪咪胡胡", "value": "520.5"},
        {"rank": "🥉 3", "team": "嘿喲嘿喲拔蘿蔔", "value": "184.9"}
      ]
    },
    {
      "metric": "💥 效率之王 (人均密度)",
      "unit": "分",
      "leaderboard": [
        {"rank": "🥇 1", "team": "咪咪胡胡", "value": "8.97"},
        {"rank": "🥈 2", "team": "Cake", "value": "4.60"},
        {"rank": "🥉 3", "team": "嘿喲嘿喲拔蘿蔔", "value": "4.00"}
      ]
    },
    {
      "metric": "🥵 燃燒殆盡 (人均痛苦 Suffer)",
      "unit": "分",
      "leaderboard": [
        {"rank": "🥇 1", "team": "咪咪胡胡", "value": "503.3"},
        {"rank": "🥈 2", "team": "嘿喲嘿喲拔蘿蔔", "value": "205.2"},
        {"rank": "🥉 3", "team": "Cake", "value": "204.2"}
      ]
    }
  ]
}

# Update game_data.json
with open('/usr/local/google/home/kerkerlai/iron-heroes-web/data/game_data.json', 'r', encoding='utf-8') as f:
    g = json.load(f)

g["classic0717"] = classic_0717_data
# Ensure season date range
g["boss"]["seasonStart"] = "2026/07/27"
g["boss"]["seasonEnd"] = "2026/09/30"

with open('/usr/local/google/home/kerkerlai/iron-heroes-web/data/game_data.json', 'w', encoding='utf-8') as f:
    json.dump(g, f, ensure_ascii=False, indent=2)

print("Classic 0717 Frozen Season Data integrated successfully!")
