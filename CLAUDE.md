# CLAUDE.md - Projektanleitung für Claude

## 🎯 Projektbeschreibung

**Fuse Angular Admin Dashboard** - Ein modernes Admin-Dashboard basierend auf dem Fuse Template Framework mit Material Design, aufgebaut mit Angular 19.

### Kernzweck
Multi-Brand SEO Analytics Dashboard mit Fokus auf GEO-AI Datenvisualisierung und SISTRIX Integration.

---

## 🏗️ Architektur & Struktur

### Verzeichnisstruktur
```
starter/
├── src/app/
│   ├── core/              # Services: auth, user, navigation, icons
│   ├── layout/            # Main Layout Component
│   ├── modules/
│   │   ├── auth/          # Authentication flows (lazy-loaded)
│   │   ├── landing/       # Public home page
│   │   └── admin/         # Protected routes (AuthGuard)
│   │       ├── dashboard/
│   │       ├── analytics/
│   │       ├── sistrix/
│   │       ├── geo-ai-pack/  # Webhook-basierte GEO-Daten
│   │       └── example/
│   ├── mock-api/          # Development Mock API
│   └── @fuse/             # Fuse Framework (directives, pipes, services, etc.)
├── public/                # Static assets, logos, images
└── dist/                  # Build output
```

### Key Technologies
- **Framework**: Angular 19.0.5 (Standalone Components)
- **UI Framework**: Angular Material 19.0.4 + Tailwind CSS 3.4.17
- **Charts**: ApexCharts via ng-apexcharts
- **i18n**: Transloco 7.5.1 (English, Turkish)
- **Build Tool**: Angular CLI 19.0.6
- **Styling**: Tailwind CSS mit Material Color Palette
- **Type**: TypeScript 5.6.3

---

## 🔐 Authentication & Guards

### Routing-Konzept
- **PublicGuard (NoAuthGuard)**: Nur für nicht authentifizierte Nutzer (sign-in, sign-up)
- **ProtectedGuard (AuthGuard)**: Nur für authentifizierte Nutzer (admin routes)
- **MockAPI**: Nutzt Mock-Daten in Entwicklung

### Wichtige Services
- `AuthService` - Authentifizierung, Token Management
- `UserService` - Benutzerdaten
- `NavigationService` - Menu/Navigation Items

---

## 🎨 Design & Styling

### Theme System
- **Verfügbare Themes**: 6 Optionen (Default, Brand, Teal, Rose, Purple, Amber)
- **Default Theme**: `theme-default`
- **Responsive Breakpoints**: sm (600px), md (960px), lg (1280px), xl (1440px)
- **Styling**: Tailwind CSS mit Material Design Prinzipien
- **Dark Mode**: Fuse unterstützt automatisch Dark Mode

### Komponenten-Konventionen
- Standalone Components (Angular 19 Style)
- ViewEncapsulation.None für Tailwind Integration
- ChangeDetectionStrategy.OnPush für Performance
- OnPush + ChangeDetectorRef.markForCheck() Pattern

---

## 📱 Module im Detail

### 1. Auth Module (`src/app/modules/auth/`)
**Lazy-loaded, ungeschützt**
- `sign-in` - Login
- `sign-up` - Registrierung
- `forgot-password` - Passwort vergessen
- `reset-password` - Passwort zurücksetzen
- `confirmation-required` - Email Bestätigung
- `unlock-session` - Session Entsperrung

### 2. Admin Module (`src/app/modules/admin/`)
**Lazy-loaded, mit AuthGuard geschützt**

#### Dashboard
- Hauptübersicht für authentifizierte Nutzer

#### Analytics
- Datenvisualisierung und Reporting

#### SISTRIX
- Integration mit SISTRIX SEO Tool

#### **Geo-AI Pack** ⭐ (Neuestes Feature)
- **Datenquelle**: Webhook `https://n8n.eom.de/webhook/geo-ai`
- **Funktionalität**:
  - Zeigt Multi-Brand Visibility Metriken
  - Historische Daten mit Datumsvergleich
  - ApexCharts Area Chart mit Gradient
  - Deutsche Fehlerausgaben
  - Deduplication nach ID
  - Sortierung nach Visibility (absteigend)
- **Data Interface**:
  ```typescript
  interface GeoAiEntry {
    id: string;
    report_date: string;
    brand_id: string;
    brand_name: string;
    visibility: number;
    visibility_percent: number;
    position_avg: number | null;
    sentiment_avg: number | null;
  }
  ```

#### Example
- Template-Komponenten und Pattern Samples

---

## 🔄 Workflows & Best Practices

### Neue Features entwickeln
1. Feature in entsprechenden Module (z.B. `admin/`) erstellen
2. Routes über Lazy Loading integrieren
3. Bei Bedarf: neue Services in `core/` erstellen
4. Material Design + Tailwind für Styling nutzen
5. OnPush ChangeDetection für Performance

### Komponenten erstellen
```typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-my-component',
  templateUrl: './my-component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatButtonModule], // Standalone
})
export class MyComponent {}
```

### Styles mit Tailwind
```html
<div class="flex items-center gap-4 p-6 bg-gray-50 dark:bg-gray-900">
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Titel</h1>
</div>
```

### Datenladung mit RxJS
```typescript
this._http.get(url)
  .pipe(
    takeUntil(this._unsubscribeAll),
    finalize(() => { this.loading = false; })
  )
  .subscribe({
    next: (data) => { /* ... */ },
    error: (err) => { /* ... */ }
  });
```

---

## 🚀 Development Workflow

### Starten
```bash
npm install  # Dependencies installieren
npm start    # Dev Server auf http://localhost:4200
```

### Build & Test
```bash
npm run build     # Production Build
npm run watch     # Watch Mode
npm run test      # Unit Tests via Karma
```

### Debugging
- Angular DevTools Chrome Extension nutzen
- Console Logs im geo-ai-pack für Webhook-Fehler
- Mock API in `src/app/mock-api/` für schnelle Tests

---

## 📊 Wichtige Externe Abhängigkeiten

- **ApexCharts**: Chart-Visualisierung (Area, Line, etc.)
- **Transloco**: i18n System
- **Quill**: Rich Text Editor
- **Material Icons**: Icon Library
- **Perfect Scrollbar**: Custom Scrollbars
- **Luxon**: DateTime Handling
- **Crypto-JS**: Verschlüsselung (falls nötig)

---

## ⚙️ Konfiguration

### `angular.json`
- Vite-basiertes Build System (Angular 19)
- Production & Development Configurations
- Asset Management

### `tailwind.config.js`
- Material Color Palette integriert
- Custom Breakpoints definiert
- Dark Mode aktiviert

### `tsconfig.json`
- Path Aliases: `@fuse`, `app/` für Imports

### `proxy.conf.json`
- Proxy für Backend-Anfragen in Entwicklung

---

## 🔗 I18n (Transloco)

### Verfügbare Sprachen
- `en` - English
- `tr` - Turkish

### Verwendung in Templates
```html
<h1>{{ 'DASHBOARD.TITLE' | transloco }}</h1>
```

### In Components
```typescript
this.translocoService.translate('KEY').subscribe(val => {
  // ...
});
```

---

## 📝 Git & Commits

### Commit-Konventionen
```
feat: add new feature
fix: bug fix
docs: documentation updates
style: styling changes
refactor: code refactoring
test: test additions
chore: maintenance
```

### Branches
- `main` - Production Branch
- Feature Branches: `feature/feature-name`

---

## 🎯 Häufige Aufgaben

### Neue Route hinzufügen
1. Component in Module erstellen
2. `.routes.ts` File in Komponenten-Ordner
3. Lazy Loading in `app.routes.ts` eintragen

### Externe API integrieren
1. Service in `core/` erstellen
2. HTTP Client injizieren
3. Error Handling + Loading States
4. Komponente subscriben mit `takeUntil()`

### Neues Material-Komponenten verwenden
1. Import in Component (`imports: [MatButtonModule]`)
2. In Template nutzen
3. Styling mit Tailwind anpassen

### Webhook-Daten laden (wie Geo-AI)
1. HTTP GET auf Webhook-URL
2. Interface für Response definieren
3. Data Processing mit Map/Filter/Sort
4. Chart/UI Update mit ChangeDetectorRef

---

## ⚠️ Wichtige Hinweise

- **ChangeDetection**: Immer OnPush verwenden + `markForCheck()` bei async Updates
- **Unsubscribe**: `takeUntil()` Pattern verwenden, nicht `.subscribe()` ohne cleanup
- **Standalone**: Keine NgModules, alle Imports direkt in Component
- **Mock API**: Für Development aktiviert, produktiv durch echte APIs ersetzen
- **Themes**: Beim Styling auf Dark Mode testen (`dark:` Klassen)
- **i18n**: Deutsche Strings in Geo-AI Pack sind hardcoded - ggfs. in transloco verschieben

---

## 🗄️ Supabase Integration

### Setup
- **Local Supabase URL**: `http://91.99.96.232:8000/`
- **Konfiguration**: `src/environments/environment.ts` - Public API Key eintragen
- **Services**: `src/app/core/supabase/`

### Verfügbare Services

#### SupabaseService (Auth)
```typescript
import { SupabaseService } from 'app/core/supabase';

constructor(private supabase: SupabaseService) {}

// Sign up
await this.supabase.signUp(email, password);

// Sign in
await this.supabase.signIn(email, password);

// Sign out
await this.supabase.signOut();

// Get current user observable
this.supabase.getAuthUser$().subscribe(user => {
  console.log(user);
});
```

#### SupabaseDatabaseService (CRUD)
```typescript
import { SupabaseDatabaseService } from 'app/core/supabase';
import { takeUntil } from 'rxjs';

export class DashboardComponent implements OnInit {
  constructor(private db: SupabaseDatabaseService) {}

  ngOnInit() {
    // GA4 Monthly Report
    this.db.getGA4MonthlyReport(100)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(data => console.log('GA4:', data));

    // GA4 Source Monthly
    this.db.getGA4SourceMonthly(50)
      .subscribe(data => console.log('GA4 Sources:', data));

    // Peec Brands
    this.db.getPeecBrands(100)
      .subscribe(brands => console.log('Brands:', brands));

    // Peec Topics
    this.db.getPeecTopics()
      .subscribe(topics => console.log('Topics:', topics));

    // SEO Keyword Rankings
    this.db.getSEOKeywordRankings(100, { startDate: '2024-01-01' })
      .subscribe(rankings => console.log('Keywords:', rankings));

    // Get rankings for specific keyword
    this.db.getKeywordRankingsByKeyword('angular')
      .subscribe(rankings => console.log('Angular Rankings:', rankings));

    // Insert new Peec brand
    this.db.insertPeecBrand({
      name: 'My Brand',
      domains: ['domain1.com', 'domain2.com'],
      project_id: 'project-123'
    }).subscribe(brand => console.log('Created:', brand));

    // Update Peec brand
    this.db.updatePeecBrand(brandId, { name: 'Updated Brand' })
      .subscribe(updated => console.log('Updated:', updated));

    // Insert SEO keyword ranking
    this.db.insertSEOKeywordRanking({
      keyword: 'angular seo',
      report_date: '2024-03-13',
      current_position: 5,
      search_volume_current: 1200,
      status: 'tracked'
    }).subscribe(ranking => console.log('Created:', ranking));

    // Generic query on any table
    this.db.query<any>('custom_table', 100)
      .subscribe(data => console.log('Custom:', data));
  }
}
```

### Verfügbare Tabellen (Konfiguriert)
**GA4:**
- `ga4_monthly_report` - sessions, leads, conversion_rate by dimension
- `ga4_source_monthly` - source breakdown
- `ga4_monthly_summary`

**Peec AI:**
- `peec_brands` - Marken mit Domains
- `peec_topics` - Topics/Keywords
- `peec_models`, `peec_prompts`, `peec_tags`

**SEO/Sistrix:**
- `seo_keyword_rankings` - Keyword positions mit history
- `ai_visibility_urls` - AI visibility tracking

**Chat & LLM:**
- `chats`, `chat_messages`
- `llm_data`, `llm_domain_usage`

### Auth mit Supabase
Der existierende `AuthService` kann optional erweitert werden um Supabase Auth zu nutzen statt Mock API.

---

## 📞 Support & Ressourcen

- Angular Docs: https://angular.io
- Material Design: https://material.io
- Tailwind CSS: https://tailwindcss.com
- ApexCharts: https://apexcharts.com
- Fuse Framework Docs: Im `@fuse/` Ordner
- **Supabase Docs**: https://supabase.com/docs
- **Supabase Agent Skills**: https://github.com/supabase/agent-skills (PostgreSQL Best Practices)
