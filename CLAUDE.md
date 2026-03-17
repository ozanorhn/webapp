# CLAUDE.md - Projektanleitung

## Projektbeschreibung

**Fuse Angular Admin Dashboard** - Multi-Brand SEO Analytics Dashboard mit GEO-AI Datenvisualisierung, SISTRIX Integration und Supabase Backend. Basierend auf Angular 19 mit Material Design + Tailwind CSS.

---

## Architektur

### Verzeichnisstruktur
```
starter/
├── src/app/
│   ├── core/                    # Globale Services
│   │   ├── auth/               # AuthService, Guards, Interceptors
│   │   ├── user/               # UserService
│   │   ├── navigation/         # NavigationService
│   │   ├── icons/              # IconsProvider
│   │   ├── transloco/          # i18n Loader
│   │   └── supabase/           # Supabase Services
│   │       ├── supabase.service.ts          # Auth (signIn, signUp, signOut)
│   │       ├── supabase-database.service.ts # CRUD + spezifische Queries
│   │       └── supabase.types.ts            # Alle Interfaces
│   ├── layout/                 # Main Layout Component
│   ├── modules/
│   │   ├── auth/               # Sign-in, Sign-up, Password Reset (lazy, NoAuthGuard)
│   │   ├── landing/            # Public Home Page
│   │   └── admin/              # Protected Routes (lazy, AuthGuard)
│   │       ├── dashboard/
│   │       ├── analytics/
│   │       ├── sistrix/
│   │       ├── geo-ai-pack/    # GEO AI Dashboard (Hauptmodul)
│   │       └── example/
│   ├── mock-api/               # Development Mock API
│   └── @fuse/                  # Fuse Framework (nicht bearbeiten)
├── public/                     # Statische Assets
└── dist/                       # Build Output
```

### Tech Stack
- **Framework**: Angular 19.0.5 (Standalone Components)
- **UI**: Angular Material 19.0.4 + Tailwind CSS 3.4.17
- **Charts**: ApexCharts (ng-apexcharts)
- **State**: Angular Signals + RxJS
- **Backend**: Supabase (PostgREST)
- **i18n**: Transloco 7.5.1
- **Build**: Angular CLI 19.0.6 (Vite)
- **TypeScript**: 5.6.3

---

## GEO AI Dashboard (Hauptmodul)

### Route
`/geo-ai-pack` (lazy-loaded, AuthGuard)

### Dateien
- `src/app/modules/admin/geo-ai-pack/geo-ai-pack.component.ts` - Gesamte Logik
- `src/app/modules/admin/geo-ai-pack/geo-ai-pack.component.html` - Template

### Architektur-Pattern: Angular Signals
Das GEO AI Dashboard nutzt **Angular Signals** als State Management (keine RxJS-Subjects, kein ChangeDetectorRef):

```
Raw Data Signals        Filter Signals              Computed Signals
─────────────────       ──────────────              ────────────────
_brands                 selectedBrand               brandSummaries
_brandVisibility        selectedRange (7/30/90)     ownBrandSummary
_aiUrls                 conversationSearch           competitorSummaries
_llmUsage               onlyOwnMentions             filteredConversations
_conversations          promptSearchTerm             extractedUrlsFromConversations
_prompts                selectedLlmModel             visibilityChartSeries
                                                     llmDomainRows
                                                     _urlConvIndex (bidirektional)
                                                     _promptConvIndex (bidirektional)
```

### Datenquellen (6 Supabase-Tabellen)
| Tabelle | Service-Methode | Typ |
|---------|----------------|-----|
| `peec_brands` | `fetchBrands()` | `PeecBrand[]` |
| `brand_visibility_history` | `fetchBrandVisibility(filters)` | `BrandVisibilityHistory[]` |
| `ai_visibility_urls` | `fetchAiUrls(filters)` | `AIVisibilityUrl[]` |
| `llm_domain_usage` | `fetchLlmUsage(filters)` | `LlmDomainUsage[]` |
| `llm_data` | `fetchConversations(filters)` | `LlmData[]` (PK: `chat_id`, NICHT `id`) |
| `peec_prompts` | `fetchPrompts(filters)` | `PeecPrompt[]` |

### Datenladung
```typescript
forkJoin({
  brands, brandVisibility, aiUrls, llmUsage, conversations, prompts
}).subscribe(results => { /* alle Signals setzen */ })
```
- Brand + Datum = Server-side Filter (trigger loadData)
- Search, LLM Model, onlyOwnMentions = Client-side Filter (computed only)

### Cross-Navigation (Drill-Down Dialog System)
Alles ist miteinander verknüpft via In-Memory-Indexes:

**Indexes (computed signals):**
- `_urlConvIndex`: URL <-> Conversation (bidirektional)
- `_promptConvIndex`: Prompt <-> Conversation (bidirektional, substring-match)

**Dialog-System:**
```typescript
type ActiveDialog =
  | { type: 'prompt'; prompt: PeecPrompt }
  | { type: 'url'; urlDetail: UrlDetail }
  | { type: 'conversation'; detail: ConversationDetail }

activeDialog = signal<ActiveDialog | null>(null);
dialogHistory = signal<ActiveDialog[]>([]);  // Back-Navigation Stack
```

**Navigation-Flow:**
- URL klicken -> URL-Dialog (zeigt Conversations, Prompts, Brands)
- Conversation klicken -> Conversation-Dialog (zeigt URLs, Prompts, Brands)
- Prompt klicken -> Prompt-Dialog (zeigt Conversations, URLs)
- Brand-Chip klicken -> Dialog schließen, Brand-Filter setzen
- Zurück-Button -> vorheriger Dialog aus History

### Eigene Brand Erkennung
Auto-Detection: sucht `eom.de` in `peec_brands.domains`. Eigene URLs/Domains werden grün hervorgehoben.

### UI-Sektionen (Template)
1. Hero Card (eigene Brand mit Sichtbarkeit, Sentiment, Erwähnungen)
2. Wettbewerber Cards (Grid)
3. KPI Row (Brands, AI-Antworten, Prompts, Ø Quellen)
4. Visibility Chart (ApexCharts Area)
5. "Wo wirst du verlinkt?" (eigene vs externe URLs, klickbar)
6. Top AI-referenzierte URLs (klickbar)
7. LLM Domain Usage Tabelle (klickbar)
8. AI-Antworten (Suche, "Nur wo ich erwähnt werde" Filter, expand, URL-Chips)
9. Prompts Tabelle (klickbar -> Dialog)

### ApexCharts Hinweise
- **KEIN gradient-Fill verwenden!** SVG `url(#...)` Referenzen brechen in Angular-Routing (schwarze Flächen). Stattdessen `fill: { type: 'solid', opacity: 0.08 }` verwenden.
- Chart Background: `background: 'transparent'`
- Tooltip: Custom HTML mit hellem Hintergrund (kein `theme: 'dark'`)
- `_fixSvgFill()` Methode korrigiert SVG fill-URLs bei Route-Wechsel

---

## Supabase

### Konfiguration
- **URL**: Proxy via `/api/supabase` (siehe `proxy.conf.json`)
- **Environment**: `src/environments/environment.ts`
- **Services**: `src/app/core/supabase/`

### Verfügbare Tabellen
**GA4:** `ga4_monthly_report`, `ga4_source_monthly`, `ga4_monthly_summary`
**Peec AI:** `peec_brands`, `peec_topics`, `peec_models`, `peec_prompts`, `peec_tags`
**SEO:** `seo_keyword_rankings`, `ai_visibility_urls`, `brand_visibility_history`, `seo_visibility_history`
**Chat/LLM:** `chats`, `chat_messages`, `llm_data` (PK: `chat_id`!), `llm_domain_usage`

### SupabaseDatabaseService API
```typescript
// Spezifische Methoden
fetchBrands(): Observable<PeecBrand[]>
fetchBrandVisibility(filters?): Observable<BrandVisibilityHistory[]>
fetchAiUrls(filters?): Observable<AIVisibilityUrl[]>
fetchLlmUsage(filters?): Observable<LlmDomainUsage[]>
fetchConversations(filters?): Observable<LlmData[]>
fetchPrompts(filters?): Observable<PeecPrompt[]>

// Generische Methoden
query<T>(tableName, limit, filters?): Observable<T[]>
insert<T>(tableName, data): Observable<T>
update<T>(tableName, id, data): Observable<T>
delete(tableName, id): Observable<void>
```

---

## Komponenten-Konventionen

### Muster
```typescript
@Component({
  selector: 'app-my-component',
  templateUrl: './my-component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, MatButtonModule, ...],
})
export class MyComponent implements OnInit, OnDestroy {
  // Signals statt BehaviorSubject
  data = signal<MyType[]>([]);
  filtered = computed(() => this.data().filter(...));

  private _unsubscribeAll = new Subject<void>();

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }
}
```

### Regeln
- **Immer OnPush** ChangeDetection
- **Signals** bevorzugen (signal, computed) statt BehaviorSubject
- **takeUntil(this._unsubscribeAll)** bei allen Subscriptions
- **Standalone Components** - keine NgModules
- **ViewEncapsulation.None** für Tailwind-Kompatibilität
- **Tailwind + Dark Mode** - immer `dark:` Klassen mitliefern

---

## Development

### Befehle
```bash
npm install          # Dependencies
npm start            # Dev Server auf http://localhost:4200
npm run build        # Production Build (npx ng build)
npm run watch        # Watch Mode
npm run test         # Unit Tests
```

### Routing
- Lazy Loading: Routes in `app.routes.ts` -> Module `.routes.ts`
- Guards: `AuthGuard` (admin), `NoAuthGuard` (auth)
- Path Aliases: `@fuse/...`, `app/...` (tsconfig.json)

### Git
```
feat: neue Features
fix: Bug Fixes
style: Styling
refactor: Refactoring
docs: Dokumentation
```

---

## Wichtige Hinweise

- **llm_data PK ist `chat_id`**, nicht `id` - bei Queries kein `.eq('id', ...)` verwenden
- **ApexCharts + Angular Routing**: Keine SVG-Gradienten verwenden (fill type gradient), da url(#...) bricht. Immer `fill: { type: 'solid' }` nutzen.
- **Eigene Brand**: Wird automatisch aus peec_brands erkannt (Domain enthält "eom.de")
- **Brand-Filter**: Server-side (trigger reload) UND client-side (computed filtering in Conversations/URLs)
- **URL-Extraktion**: Regex `/https?:\/\/([\w.-]+)(\/[^\s\)"'<>]*)*/gi` aus Assistant Messages
- **Proxy**: API-Calls gehen über `/api/supabase` Proxy (proxy.conf.json)
