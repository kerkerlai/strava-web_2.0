import os, json, requests
SUPABASE_URL = "https://yxkvbkfnlqwlybhmugki.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a3Zia2ZubHF3bHliaG11Z2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NDIyODYsImV4cCI6MjEwMjUxODI4Nn0.Jky4o080Gn9-prx-G0aj7dCl7rmA1dJWN3BZgkVmjwo"
SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

r = requests.get(f"{SUPABASE_URL}/rest/v1/activities?hero=eq.Kerker&select=id", headers=SUPABASE_HEADERS)
acts = r.json()
print("Kerker acts in Supabase:", len(acts))
ids = [str(a["id"]) for a in acts]
print("Has 19760709586?", "19760709586" in ids)

# Also test TRIMP logic for these acts to see total
