/**
 * 鋼鐵英雄紀元 - Supabase 100% 雲端資料庫客戶端
 * 永久取代 Google Sheet，提供全站秒級跨裝置即時同步
 */

const SUPABASE_CONFIG = {
  url: "https://yxkvbkfnlqwlybhmugki.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a3Zia2ZubHF3bHliaG11Z2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NDIyODYsImV4cCI6MjEwMjUxODI4Nn0.Jky4o080Gn9-prx-G0aj7dCl7rmA1dJWN3BZgkVmjwo"
};

const supabase = {
  async fetch(table, params = "") {
    const url = `${SUPABASE_CONFIG.url}/rest/v1/${table}${params ? `?${params}` : ""}`;
    const res = await fetch(url, {
      headers: {
        "apikey": SUPABASE_CONFIG.anonKey,
        "Authorization": `Bearer ${SUPABASE_CONFIG.anonKey}`,
        "Content-Type": "application/json"
      }
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Supabase fetch [${table}] failed (${res.status}): ${err}`);
    }
    return await res.json();
  },

  async insert(table, data) {
    const url = `${SUPABASE_CONFIG.url}/rest/v1/${table}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_CONFIG.anonKey,
        "Authorization": `Bearer ${SUPABASE_CONFIG.anonKey}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Supabase insert [${table}] failed (${res.status}): ${err}`);
    }
    return await res.json();
  },

  async update(table, matchQuery, data) {
    const url = `${SUPABASE_CONFIG.url}/rest/v1/${table}?${matchQuery}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_CONFIG.anonKey,
        "Authorization": `Bearer ${SUPABASE_CONFIG.anonKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Supabase update [${table}] failed (${res.status}): ${err}`);
    }
    return await res.json();
  },

  async delete(table, matchQuery) {
    const url = `${SUPABASE_CONFIG.url}/rest/v1/${table}?${matchQuery}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        "apikey": SUPABASE_CONFIG.anonKey,
        "Authorization": `Bearer ${SUPABASE_CONFIG.anonKey}`,
        "Content-Type": "application/json"
      }
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Supabase delete [${table}] failed (${res.status}): ${err}`);
    }
    return true;
  }
};

window.supabase = supabase;
