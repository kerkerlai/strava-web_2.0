import requests

url = "https://yxkvbkfnlqwlybhmugki.supabase.co/rest/v1/game_config"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a3Zia2ZubHF3bHliaG11Z2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NDIyODYsImV4cCI6MjEwMjUxODI4Nn0.Jky4o080Gn9-prx-G0aj7dCl7rmA1dJWN3BZgkVmjwo",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a3Zia2ZubHF3bHliaG11Z2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NDIyODYsImV4cCI6MjEwMjUxODI4Nn0.Jky4o080Gn9-prx-G0aj7dCl7rmA1dJWN3BZgkVmjwo",
}

print("Fetching game_config...")
print(requests.get(url, headers=headers).json())

print("Testing patch...")
res = requests.patch(f"{url}?key=eq.active_mode", headers={**headers, "Prefer": "return=representation"}, json={"value": "world_boss"})
print(res.status_code)
print(res.text)

print("Testing update (insert with resolution=merge-duplicates)...")
res2 = requests.post(f"{url}", headers={**headers, "Prefer": "resolution=merge-duplicates,return=representation"}, json={"key": "active_mode", "value": "world_boss"})
print(res2.status_code)
print(res2.text)
