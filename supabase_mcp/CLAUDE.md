# Supabase MCP Project

## 📋 Projektbeschreibung
Lokales Supabase-Setup für SEO-/Analytics-Datenmanagement. Gehostet auf Ubuntu mit Docker unter pw.eom.de.

## 🔌 Supabase-Verbindung

### URLs
- **REST API (Kong)**: `https://pw.eom.de:8443/rest/v1/`
- **Dashboard**: `https://pw.eom.de` (Benutzer: `supabaseeom`)
- **PostgreSQL (intern Docker)**: `db:5432`
- **PostgreSQL (extern)**: `pw.eom.de:5432` (über Supavisor)

### API-Keys
```
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE

SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q
```

### Datenbank-Credentials
- **Host**: pw.eom.de (extern) / db (intern)
- **Port**: 5432 (PostgreSQL) / 6543 (Supavisor)
- **Database**: postgres
- **User**: postgres
- **Password**: `your-super-secret-and-long-postgres-password`

## 📊 Verfügbare Tabellen (11)

1. **ai_visibility_urls** - AI-Sichtbarkeitsdaten für URLs
2. **brand_visibility_history** - Historische Marken-Sichtbarkeitsdaten
3. **chat_messages** - Chat-Nachrichten
4. **chats** - Chat-Sessions
5. **ga4_monthly_report** - Google Analytics 4 Monatsberichte
6. **ga4_monthly_summary** - GA4 Monatszusammenfassungen
7. **ga4_source_monthly** - GA4 Quellen pro Monat
8. **llm_data** - LLM-Daten
9. **llm_domain_usage** - Domain-Nutzung durch LLM
10. **seo_keyword_rankings** - SEO Keyword-Rankings
11. **seo_visibility_history** - Historische SEO-Sichtbarkeitsdaten

## 🛠️ Scripts

### Alle Tabellen auflisten
```bash
source venv/bin/activate && python3 list_tables.py
```

### REST API Test
```bash
curl -s -H "apikey: $ANON_KEY" \
  "https://pw.eom.de:8443/rest/v1/"
```

## 🔧 Technologie-Stack
- **Hosting**: Ubuntu Docker
- **Backend**: Supabase (PostgreSQL + PostgREST + Kong)
- **MCP Server**: https://mcp.supabase.com/mcp
- **Reverse Proxy**: Kong (Port 8000/8443)
- **Database Pooler**: Supavisor (Port 6543)

## 📝 Wichtige Anmerkungen

### Verbindungsmethode
- Nutze **Kong REST API** (Port 8443/8000) für externe Verbindungen
- Direkter PostgreSQL-Zugriff braucht Supavisor Tenant-ID konfiguriert
- SSL-Zertifikat lokal signed (pw.eom.de)

### MCP-Konfiguration
Die `.claude.json` verweist auf das Supabase MCP:
```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp"
    }
  }
}
```

## 🚀 Häufige Aufgaben

### Daten abfragen
```bash
# Über REST API
curl -s -H "apikey: $ANON_KEY" \
  "https://pw.eom.de:8443/rest/v1/seo_keyword_rankings?limit=10"
```

### Python-Anfrage
```python
import requests
headers = {
    "apikey": "ANON_KEY_HERE",
    "Content-Type": "application/json"
}
response = requests.get(
    "https://pw.eom.de:8443/rest/v1/seo_keyword_rankings",
    headers=headers,
    verify=False
)
```

---
**Zuletzt aktualisiert**: 2026-03-05
