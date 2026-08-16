import json
with open('/usr/local/google/home/kerkerlai/iron-heroes-web/data/game_data.json') as f:
    d = json.load(f)
print('activeMode in game_data.json:', d.get('activeMode'))
print('boss season in game_data.json:', d.get('boss', {}).get('seasonStart'), '~', d.get('boss', {}).get('seasonEnd'))
