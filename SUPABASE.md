# Supabase Integration Guide

## 🎯 Overview

Lokale Supabase-Instanz mit GA4, Peec AI und SEO-Daten für dein Analytics Dashboard.

**Supabase URL:** `http://91.99.96.232:8000/`

---

## 📦 Installations-Status

✅ `@supabase/supabase-js` v2.99.1 installiert
✅ TypeScript Types definiert
✅ Services erstellt
✅ Demo Component vorhanden
✅ Environment Konfiguration gesetzt

---

## 🔧 Struktur

```
src/app/core/supabase/
├── supabase.service.ts              # Authentication (Login, Signup, Sessions)
├── supabase-database.service.ts     # CRUD für GA4, Peec, SEO
├── supabase.types.ts                # TypeScript Interfaces
├── supabase-demo.component.ts       # Demo/Test Component
└── index.ts                         # Barrel Export
```

---

## 📊 Verfügbare Tabellen

### GA4 Analytics
```
ga4_monthly_report
├── id: string
├── report_date: string
├── dimension_type: string
├── dimension_value: string
├── sessions: number
├── leads: number
├── conversion_rate: number
└── created_at: string

ga4_source_monthly
├── id: string
├── report_date: string
├── source: string
├── sessions: number
├── leads: number
├── conversion_rate: number
└── created_at: string
```

### Peec AI
```
peec_brands
├── id: string
├── name: string
├── domains: string[]
├── project_id: string
├── created_at: string
└── updated_at: string

peec_topics
├── id: string
├── name: string
├── project_id: string
└── created_at: string

peec_models, peec_prompts, peec_tags
```

### SEO/Sistrix
```
seo_keyword_rankings
├── id: string
├── keyword: string
├── report_date: string
├── current_position: number
├── last_position: number | null
├── search_volume_current: number
├── search_volume_last: number | null
├── diff: number | null
├── percent_change: number | null
├── status: string
└── created_at: string

ai_visibility_urls
```

### Chat & LLM
```
chats, chat_messages
llm_data, llm_domain_usage
```

---

## 🚀 Verwendung

### 1. In deinen Komponenten importieren

```typescript
import { SupabaseService, SupabaseDatabaseService } from 'app/core/supabase';

@Component({...})
export class MyComponent {
  constructor(
    private db: SupabaseDatabaseService,
    private auth: SupabaseService
  ) {}
}
```

### 2. Daten laden (GA4 Beispiel)

```typescript
import { takeUntil } from 'rxjs';

export class DashboardComponent implements OnInit {
  ga4Data: GA4MonthlyReport[] = [];

  ngOnInit() {
    this.db.getGA4MonthlyReport(100)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(data => {
        this.ga4Data = data;
      });
  }
}
```

### 3. Daten einfügen

```typescript
this.db.insertGA4MonthlyReport({
  report_date: '2024-03-13',
  dimension_type: 'country',
  dimension_value: 'DE',
  sessions: 150,
  leads: 25,
  conversion_rate: 16.67
}).subscribe(newRecord => {
  console.log('Created:', newRecord);
});
```

### 4. Daten aktualisieren

```typescript
this.db.updatePeecBrand(brandId, {
  name: 'Updated Brand Name'
}).subscribe(updated => {
  console.log('Updated:', updated);
});
```

### 5. Daten löschen

```typescript
this.db.delete('peec_brands', brandId).subscribe(() => {
  console.log('Deleted');
});
```

---

## 🧪 Demo Component testen

Nutze die Demo-Komponente um die Integration zu testen:

```typescript
// In einer beliebigen Komponente
import { SupabaseDemoComponent } from 'app/core/supabase/supabase-demo.component';

@Component({
  imports: [SupabaseDemoComponent],
  template: `<app-supabase-demo></app-supabase-demo>`
})
export class TestComponent {}
```

Oder direkt in `app.routes.ts`:

```typescript
{
  path: 'supabase-demo',
  component: SupabaseDemoComponent
}
```

Dann navigiere zu: `http://localhost:4200/supabase-demo`

---

## 🔐 Authentication

### Sign Up

```typescript
const { session, error } = await this.auth.signUp(
  'user@example.com',
  'password123'
);
```

### Sign In

```typescript
const session = await this.auth.signIn(
  'user@example.com',
  'password123'
);
```

### Sign Out

```typescript
await this.auth.signOut();
```

### Listen to Auth Changes

```typescript
this.auth.getAuthUser$().subscribe(user => {
  if (user) {
    console.log('Logged in as:', user.email);
  } else {
    console.log('Not authenticated');
  }
});
```

---

## 🛠️ Generic Methods

Für andere Tabellen oder custom Abfragen:

```typescript
// Beliebige Tabelle abfragen
this.db.query<MyType>('custom_table', 50)
  .subscribe(data => console.log(data));

// Einfügen
this.db.insert<MyType>('custom_table', data)
  .subscribe(newRecord => console.log(newRecord));

// Aktualisieren
this.db.update<MyType>('custom_table', id, updateData)
  .subscribe(updated => console.log(updated));

// Löschen
this.db.delete('custom_table', id)
  .subscribe(() => console.log('Deleted'));
```

---

## 📝 Tipps & Best Practices

1. **Immer `takeUntil()` verwenden** um Memory Leaks zu vermeiden
   ```typescript
   this.db.getGA4MonthlyReport()
     .pipe(takeUntil(this._unsubscribeAll))
     .subscribe(data => {...});
   ```

2. **ChangeDetectionStrategy.OnPush** für Performance
   ```typescript
   @Component({
     changeDetection: ChangeDetectionStrategy.OnPush
   })
   ```

3. **Mit Loading State arbeiten**
   ```typescript
   this.loading = true;
   this.db.getGA4MonthlyReport()
     .pipe(finalize(() => this.loading = false))
     .subscribe(data => this.data = data);
   ```

4. **Error Handling**
   ```typescript
   .subscribe({
     next: (data) => { /* ... */ },
     error: (err) => console.error('API Error:', err)
   });
   ```

---

## 🔗 Integration in bestehende Module

### Dashboard

```typescript
import { SupabaseDatabaseService } from 'app/core/supabase';

@Component({...})
export class DashboardComponent implements OnInit {
  ga4Data: GA4MonthlyReport[] = [];
  seoKeywords: SEOKeywordRanking[] = [];

  constructor(private db: SupabaseDatabaseService) {}

  ngOnInit() {
    // Load GA4 data
    this.db.getGA4MonthlyReport(100)
      .subscribe(data => this.ga4Data = data);

    // Load SEO keywords
    this.db.getSEOKeywordRankings(100)
      .subscribe(data => this.seoKeywords = data);
  }
}
```

### Analytics Module

Nutze Peec und GA4 Daten für erweiterte Analytics:

```typescript
this.db.getPeecBrands()
  .subscribe(brands => {
    // Render brand insights
  });
```

### SEO Module

Erweitere sistrix-modul mit echten Daten:

```typescript
this.db.getSEOKeywordRankings(100)
  .subscribe(rankings => {
    // Show keyword performance
  });
```

---

## 🐛 Troubleshooting

### Fehler: "CORS Error"
- Supabase muss CORS aktiviert haben
- Oder Proxy-Konfiguration nutzen (siehe `proxy.conf.json`)

### Fehler: "401 Unauthorized"
- API Key korrekt in `environment.ts`?
- Token abgelaufen? (Nur bei Auth)

### Keine Daten werden geladen
- Tabellennamen korrekt? (siehe `supabase-database.service.ts`)
- Daten in der Tabelle vorhanden?
- Browser Console für Details checken

### Performance Issues
- `limit` Parameter reduzieren
- Pagination implementieren
- Indices in der Datenbank überprüfen

---

## 📞 Support

Bei Fragen zu Supabase:
- [Supabase Docs](https://supabase.com/docs)
- [Supabase Agent Skills](https://github.com/supabase/agent-skills) - PostgreSQL Best Practices
- Local Supabase: Admin Panel unter `http://91.99.96.232:8000`

---

## 📦 Nächste Schritte

- [ ] Auth mit deinen Supabase Users verbinden
- [ ] Dashboard komponente mit GA4 Daten verbinden
- [ ] SEO Modul mit echten Keyword Rankings
- [ ] Peec AI Integration für Brand Insights
- [ ] Real-time Updates mit Supabase Subscriptions
- [ ] Performance Optimierung (Caching, Pagination)
