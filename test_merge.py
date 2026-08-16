import json

with open('/usr/local/google/home/kerkerlai/iron-heroes-web/data/game_data.json') as f:
    d = json.load(f)

print('Total activities in game_data.json:', len(d.get('activities', [])))
for a in d.get('activities', [])[:5]:
    print(a.get('id'), a.get('hero'), a.get('time'), a.get('damage'))
