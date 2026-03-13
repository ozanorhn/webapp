import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
    NO_ERRORS_SCHEMA,
    signal,
    computed,
} from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { ApexOptions, NgApexchartsModule } from 'ng-apexcharts';
import { Subject, forkJoin, takeUntil, finalize } from 'rxjs';
import { SupabaseDatabaseService } from '../../../core/supabase/supabase-database.service';
import {
    BrandVisibilityHistory,
    AIVisibilityUrl,
    LlmDomainUsage,
    LlmData,
    PeecPrompt,
    PeecBrand,
} from '../../../core/supabase/supabase.types';

// ============== Local Interfaces ==============

interface BrandSummary {
    brand_name: string;
    latestVisibility: number;
    previousVisibility: number | null;
    change: number;
    latestPosition: number | null;
    latestSentiment: number | null;
}

interface ExtractedUrl {
    url: string;
    domain: string;
    sourceMessage: string;
    count?: number;
}

interface DomainUsageRow {
    domain: string;
    totalCitations: number;
    byModel: { model: string; count: number }[];
}

// ============== Placeholder Data ==============

const PLACEHOLDER_BRAND_VISIBILITY: BrandVisibilityHistory[] = [
    {
        id: 'ph_1',
        brand_id: null,
        brand_name: 'Brand A',
        report_date: '2026-02-24',
        visibility: 35,
        visibility_percent: 35.5,
        sentiment: 72,
        position_avg: 2.3,
        created_at: '2026-02-24T10:00:00Z',
    },
    {
        id: 'ph_2',
        brand_id: null,
        brand_name: 'Brand A',
        report_date: '2026-02-25',
        visibility: 36,
        visibility_percent: 36.2,
        sentiment: 71,
        position_avg: 2.2,
        created_at: '2026-02-25T10:00:00Z',
    },
    {
        id: 'ph_3',
        brand_id: null,
        brand_name: 'Brand B',
        report_date: '2026-02-24',
        visibility: 28,
        visibility_percent: 28.1,
        sentiment: 65,
        position_avg: 3.5,
        created_at: '2026-02-24T10:00:00Z',
    },
    {
        id: 'ph_4',
        brand_id: null,
        brand_name: 'Brand B',
        report_date: '2026-02-25',
        visibility: 29,
        visibility_percent: 29.4,
        sentiment: 67,
        position_avg: 3.3,
        created_at: '2026-02-25T10:00:00Z',
    },
    {
        id: 'ph_5',
        brand_id: null,
        brand_name: 'Brand C',
        report_date: '2026-02-24',
        visibility: 42,
        visibility_percent: 42.7,
        sentiment: 78,
        position_avg: 1.8,
        created_at: '2026-02-24T10:00:00Z',
    },
    {
        id: 'ph_6',
        brand_id: null,
        brand_name: 'Brand C',
        report_date: '2026-02-25',
        visibility: 44,
        visibility_percent: 44.1,
        sentiment: 79,
        position_avg: 1.7,
        created_at: '2026-02-25T10:00:00Z',
    },
    {
        id: 'ph_7',
        brand_id: null,
        brand_name: 'Brand D',
        report_date: '2026-02-24',
        visibility: 19,
        visibility_percent: 19.3,
        sentiment: 52,
        position_avg: 4.2,
        created_at: '2026-02-24T10:00:00Z',
    },
    {
        id: 'ph_8',
        brand_id: null,
        brand_name: 'Brand D',
        report_date: '2026-02-25',
        visibility: 20,
        visibility_percent: 20.5,
        sentiment: 54,
        position_avg: 4.1,
        created_at: '2026-02-25T10:00:00Z',
    },
];

const PLACEHOLDER_AI_URLS: AIVisibilityUrl[] = [
    {
        id: 'ph_url_1',
        url: 'https://brand-a.com/article',
        domain: 'brand-a.com',
        classification: 'owned',
        brand_name: 'Brand A',
        mention_count: 12,
        llm_model: 'ChatGPT',
        report_date: '2026-02-25',
        created_at: '2026-02-25T10:00:00Z',
    },
    {
        id: 'ph_url_2',
        url: 'https://competitor.com/comparison',
        domain: 'competitor.com',
        classification: 'competitor',
        brand_name: 'Brand A',
        mention_count: 8,
        llm_model: 'Perplexity',
        report_date: '2026-02-25',
        created_at: '2026-02-25T10:00:00Z',
    },
    {
        id: 'ph_url_3',
        url: 'https://resource.de/guide',
        domain: 'resource.de',
        classification: 'neutral',
        brand_name: null,
        mention_count: 5,
        llm_model: 'Google AI',
        report_date: '2026-02-25',
        created_at: '2026-02-25T10:00:00Z',
    },
];

const PLACEHOLDER_LLM_USAGE: LlmDomainUsage[] = [
    {
        id: 'ph_llm_1',
        domain: 'brand-a.com',
        llm_model: 'ChatGPT',
        citation_count: 45,
        report_date: '2026-02-25',
        brand_name: 'Brand A',
        created_at: '2026-02-25T10:00:00Z',
    },
    {
        id: 'ph_llm_2',
        domain: 'brand-a.com',
        llm_model: 'Perplexity',
        citation_count: 32,
        report_date: '2026-02-25',
        brand_name: 'Brand A',
        created_at: '2026-02-25T10:00:00Z',
    },
    {
        id: 'ph_llm_3',
        domain: 'brand-b.com',
        llm_model: 'ChatGPT',
        citation_count: 28,
        report_date: '2026-02-25',
        brand_name: 'Brand B',
        created_at: '2026-02-25T10:00:00Z',
    },
];

@Component({
    selector: 'app-geo-ai-pack',
    templateUrl: './geo-ai-pack.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        MatFormFieldModule,
        MatInputModule,
        NgApexchartsModule,
        DecimalPipe,
        DatePipe,
    ],
    schemas: [NO_ERRORS_SCHEMA],
})
export class GeoAiPackComponent implements OnInit, OnDestroy {
    // ============== Raw Data Signals ==============

    private _brands = signal<PeecBrand[]>([]);
    private _brandVisibility = signal<BrandVisibilityHistory[]>([]);
    private _aiUrls = signal<AIVisibilityUrl[]>([]);
    private _llmUsage = signal<LlmDomainUsage[]>([]);
    private _conversations = signal<LlmData[]>([]);
    private _prompts = signal<PeecPrompt[]>([]);

    // ============== Filter Signals (Server-side) ==============

    selectedBrand = signal<string>('all');
    selectedDateRange = signal<{ start: string; end: string }>({
        start: this._getDateString(-30),
        end: this._getDateString(0),
    });

    // ============== Filter Signals (Client-side) ==============

    selectedLlmModel = signal<string>('all');
    conversationSearch = signal<string>('');
    promptSearchTerm = signal<string>('');

    // ============== UI State Signals ==============

    loading = signal<boolean>(false);
    error = signal<string | null>(null);
    dataLoaded = signal<boolean>(false);
    activeTab = signal<'visibility' | 'urls' | 'llm' | 'conversations' | 'prompts'>('visibility');

    // ============== Computed Signals ==============

    availableBrands = computed<string[]>(() => {
        const peecBrands = this._brands().map((b) => b.name);
        const visibilityBrands = this._brandVisibility().map((r) => r.brand_name);
        const allNames = new Set([...peecBrands, ...visibilityBrands]);
        return ['all', ...Array.from(allNames).sort()];
    });

    /**
     * Computed visibility from llm_data conversations:
     * Scans assistant_message for brand name/domain mentions,
     * groups by date, calculates visibility_percent per brand per date.
     * Used as fallback when brand_visibility_history table is empty.
     */
    private _computedVisibility = computed<BrandVisibilityHistory[]>(() => {
        const dbData = this._brandVisibility();
        if (dbData.length) return dbData; // Use real DB data if available

        const brands = this._brands();
        const conversations = this._conversations();
        if (!brands.length || !conversations.length) return [];

        // Build search terms for each brand (name + domains)
        const brandSearchTerms = brands.map((b) => {
            const terms = [b.name.toLowerCase()];
            if (b.domains) {
                const domainStr = Array.isArray(b.domains) ? b.domains.join(',') : String(b.domains);
                domainStr.split(',').forEach((d) => {
                    const trimmed = d.trim().toLowerCase();
                    if (trimmed) terms.push(trimmed);
                });
            }
            return { brand: b, terms };
        });

        // Group conversations by date
        const convsByDate = new Map<string, LlmData[]>();
        for (const conv of conversations) {
            const date = conv.created_at.substring(0, 10); // YYYY-MM-DD
            if (!convsByDate.has(date)) convsByDate.set(date, []);
            convsByDate.get(date)!.push(conv);
        }

        const result: BrandVisibilityHistory[] = [];
        const sortedDates = [...convsByDate.keys()].sort();

        for (const date of sortedDates) {
            const dayConvs = convsByDate.get(date)!;
            const totalConvs = dayConvs.length;

            for (const { brand, terms } of brandSearchTerms) {
                let mentionCount = 0;
                let totalMentions = 0;

                for (const conv of dayConvs) {
                    const text = (conv.assistant_message ?? '').toLowerCase();
                    const mentioned = terms.some((t) => text.includes(t));
                    if (mentioned) {
                        mentionCount++;
                        // Count total occurrences for position approximation
                        for (const t of terms) {
                            const regex = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                            totalMentions += (text.match(regex) || []).length;
                        }
                    }
                }

                const visibilityPercent = totalConvs > 0
                    ? Math.round((mentionCount / totalConvs) * 10000) / 100
                    : 0;

                result.push({
                    id: `computed_${brand.id}_${date}`,
                    brand_id: brand.id,
                    brand_name: brand.name,
                    report_date: date,
                    visibility: mentionCount,
                    visibility_percent: visibilityPercent,
                    sentiment: null,
                    position_avg: mentionCount > 0
                        ? Math.round((totalMentions / mentionCount) * 10) / 10
                        : null,
                    created_at: date + 'T00:00:00Z',
                });
            }
        }

        console.log(`📊 Computed visibility from ${conversations.length} conversations: ${result.length} data points`);
        return result;
    });

    brandSummaries = computed<BrandSummary[]>(() => {
        const data = this._computedVisibility();
        if (!data.length) {
            // Last fallback: brand names only
            return this._brands().map((b) => ({
                brand_name: b.name,
                latestVisibility: 0,
                previousVisibility: null,
                change: 0,
                latestPosition: null,
                latestSentiment: null,
            }));
        }

        const allDates = [...new Set(data.map((e) => e.report_date))].sort();
        const latestDate = allDates[allDates.length - 1];
        const previousDate = allDates.length >= 2 ? allDates[allDates.length - 2] : null;

        const brandMap = new Map<string, Map<string, BrandVisibilityHistory>>();
        for (const entry of data) {
            if (!brandMap.has(entry.brand_name)) {
                brandMap.set(entry.brand_name, new Map());
            }
            brandMap.get(entry.brand_name)!.set(entry.report_date, entry);
        }

        const summaries: BrandSummary[] = [];
        for (const [brandName, dateMap] of brandMap) {
            const latest = dateMap.get(latestDate);
            const previous = previousDate ? dateMap.get(previousDate) : null;

            const latestVis = latest?.visibility_percent ?? 0;
            const prevVis = previous?.visibility_percent ?? null;
            const change =
                prevVis !== null && prevVis > 0
                    ? Math.round(((latestVis - prevVis) / prevVis) * 1000) / 100
                    : 0;

            summaries.push({
                brand_name: brandName,
                latestVisibility: latestVis,
                previousVisibility: prevVis,
                change,
                latestPosition: latest?.position_avg ?? null,
                latestSentiment: latest?.sentiment ?? null,
            });
        }
        return summaries.sort((a, b) => b.latestVisibility - a.latestVisibility);
    });

    visibilityChartSeries = computed<{ name: string; data: number[] }[]>(() => {
        const data = this._computedVisibility();
        const brandFilter = this.selectedBrand();

        const allDates = [...new Set(data.map((e) => e.report_date))].sort();

        const brandMap = new Map<string, Map<string, BrandVisibilityHistory>>();
        for (const entry of data) {
            if (!brandMap.has(entry.brand_name)) {
                brandMap.set(entry.brand_name, new Map());
            }
            brandMap.get(entry.brand_name)!.set(entry.report_date, entry);
        }

        const series: { name: string; data: number[] }[] = [];
        const brands = this.brandSummaries();

        for (const brand of brands) {
            const dateMap = brandMap.get(brand.brand_name);
            if (!dateMap) continue;
            if (brandFilter !== 'all' && brand.brand_name !== brandFilter) continue;

            series.push({
                name: brand.brand_name,
                data: allDates.map((date) => {
                    const entry = dateMap.get(date);
                    return entry ? Math.round(entry.visibility_percent * 100) / 100 : 0;
                }),
            });
        }

        return series;
    });

    visibilityChartCategories = computed<string[]>(() => {
        const data = this._computedVisibility();
        const allDates = [...new Set(data.map((e) => e.report_date))].sort();

        return allDates.map((d) => {
            const date = new Date(d + 'T00:00:00');
            return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        });
    });

    chartVisibilityConfig = computed<ApexOptions>(() => ({
        chart: {
            type: 'area',
            height: 380,
            fontFamily: 'inherit',
            foreColor: 'inherit',
            background: 'transparent',
            toolbar: { show: false },
            zoom: { enabled: false },
        },
        colors: ['#10B981', '#818CF8', '#FB7185', '#38BDF8', '#FBBF24', '#A78BFA'],
        dataLabels: { enabled: false },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0.05,
                stops: [0, 95, 100],
            },
        },
        grid: {
            show: true,
            borderColor: 'rgba(51,65,85,0.15)',
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } },
        },
        series: this.visibilityChartSeries(),
        stroke: { width: 2.5, curve: 'smooth' },
        markers: { size: 4, hover: { size: 7 } },
        legend: { show: true, position: 'top', labels: { colors: '#94A3B8' } },
        tooltip: {
            theme: undefined,
            shared: true,
            intersect: false,
            y: {
                formatter: (val: number): string => (val != null ? val.toFixed(1) + '%' : '-'),
            },
            custom: ({ series: s, seriesIndex, dataPointIndex, w }): string => {
                const items = w.config.series
                    .map((ser: any, i: number) => ({
                        name: ser.name,
                        value: s[i][dataPointIndex],
                        color: w.config.colors[i],
                    }))
                    .filter((item: any) => item.value != null)
                    .sort((a: any, b: any) => b.value - a.value);

                const cats = w.config.xaxis?.categories ?? [];
                const date = cats[dataPointIndex] ?? '';
                let html = `<div style="padding:10px 14px;font-size:13px;background:rgba(30,41,59,0.95);border-radius:10px;border:none;box-shadow:0 4px 12px rgba(0,0,0,0.15);">`;
                html += `<div style="font-weight:600;margin-bottom:6px;color:#CBD5E1;">${date}</div>`;
                for (const item of items) {
                    html += `<div style="display:flex;align-items:center;gap:8px;padding:2px 0;">`;
                    html += `<span style="width:10px;height:10px;border-radius:50%;background:${item.color};display:inline-block;"></span>`;
                    html += `<span style="flex:1;color:#94A3B8;">${item.name}</span>`;
                    html += `<span style="font-weight:600;color:#E2E8F0;margin-left:12px;">${item.value.toFixed(1)}%</span>`;
                    html += `</div>`;
                }
                html += `</div>`;
                return html;
            },
        },
        xaxis: {
            categories: this.visibilityChartCategories(),
            labels: { style: { colors: '#CBD5E1' } },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            show: true,
            labels: {
                style: { colors: '#94A3B8' },
                formatter: (val: number): string => (val != null ? val.toFixed(0) + '%' : ''),
            },
        },
    }));

    filteredAiUrls = computed<AIVisibilityUrl[]>(() => {
        const urls = this._aiUrls();
        const brand = this.selectedBrand();
        if (brand === 'all') return urls.slice(0, 10);
        return urls.filter((u) => u.brand_name === brand).slice(0, 10);
    });

    extractedUrlsFromConversations = computed<ExtractedUrl[]>(() => {
        const convs = this._conversations();
        const urlMap = new Map<string, ExtractedUrl & { count: number }>();

        for (const conv of convs) {
            if (!conv.assistant_message) continue;
            const extracted = this._extractUrlsFromText(conv.assistant_message);
            for (const e of extracted) {
                const existing = urlMap.get(e.url);
                if (existing) {
                    existing.count++;
                } else {
                    urlMap.set(e.url, { ...e, count: 1 });
                }
            }
        }

        return Array.from(urlMap.values())
            .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
            .slice(0, 20);
    });

    llmDomainRows = computed<DomainUsageRow[]>(() => {
        const usage = this._llmUsage();
        const modelFilter = this.selectedLlmModel();

        const domainMap = new Map<string, { byModel: Map<string, number>; total: number }>();

        for (const item of usage) {
            if (modelFilter !== 'all' && item.llm_model !== modelFilter) continue;

            if (!domainMap.has(item.domain)) {
                domainMap.set(item.domain, { byModel: new Map(), total: 0 });
            }

            const domain = domainMap.get(item.domain)!;
            const count = item.citation_count ?? 0;
            const model = item.llm_model ?? 'Unknown';

            domain.byModel.set(model, (domain.byModel.get(model) ?? 0) + count);
            domain.total += count;
        }

        const rows: DomainUsageRow[] = [];
        for (const [domain, data] of domainMap) {
            rows.push({
                domain,
                totalCitations: data.total,
                byModel: Array.from(data.byModel.entries()).map(([model, count]) => ({
                    model,
                    count,
                })),
            });
        }

        return rows.sort((a, b) => b.totalCitations - a.totalCitations);
    });

    availableLlmModels = computed<string[]>(() => {
        const models = new Set(
            this._llmUsage()
                .map((u) => u.llm_model)
                .filter(Boolean)
        );
        return ['all', ...Array.from(models).sort()];
    });

    filteredConversations = computed<LlmData[]>(() => {
        const search = this.conversationSearch().toLowerCase();
        const convs = this._conversations();
        if (!search) return convs;
        return convs.filter(
            (c) =>
                c.user_message?.toLowerCase().includes(search) ||
                c.assistant_message?.toLowerCase().includes(search)
        );
    });

    filteredPrompts = computed<PeecPrompt[]>(() => {
        const term = this.promptSearchTerm().toLowerCase();
        const prompts = this._prompts();
        if (!term) return prompts;
        return prompts.filter(
            (p) =>
                p.text?.toLowerCase().includes(term) ||
                p.tags?.some((t) => t?.toLowerCase().includes(term))
        );
    });

    totalBrands = computed(() => this._brands().length);
    totalConversations = computed(() => this._conversations().length);
    totalPrompts = computed(() => this._prompts().length);
    avgSourcesPerConv = computed(() => {
        const convs = this._conversations();
        if (!convs.length) return 0;
        const total = convs.reduce((sum, c) => sum + (c.sources_count ?? 0), 0);
        return Math.round((total / convs.length) * 10) / 10;
    });

    /** Conversations grouped by model for the overview */
    conversationsByModel = computed(() => {
        const convs = this._conversations();
        const map = new Map<string, number>();
        for (const c of convs) {
            const model = c.model_id ?? 'unknown';
            map.set(model, (map.get(model) ?? 0) + 1);
        }
        return Array.from(map.entries())
            .map(([model, count]) => ({ model, count }))
            .sort((a, b) => b.count - a.count);
    });

    /** Brands with their domains for display */
    brandCards = computed(() => {
        const brands = this._brands();
        const summaries = this.brandSummaries();
        return brands.map((b) => {
            const summary = summaries.find((s) => s.brand_name === b.name);
            return {
                ...b,
                domain: Array.isArray(b.domains) ? b.domains.join(', ') : String(b.domains ?? ''),
                visibility: summary?.latestVisibility ?? 0,
                change: summary?.change ?? 0,
                mentions: summary?.latestPosition ?? null,
            };
        });
    });

    // ============== UI Expand State ==============

    expandedConversations = signal<Set<string>>(new Set());
    showAllConversations = signal<boolean>(false);
    showAllPrompts = signal<boolean>(false);

    /** Visible conversations (limited or all) */
    visibleConversations = computed(() => {
        const filtered = this.filteredConversations();
        return this.showAllConversations() ? filtered : filtered.slice(0, 10);
    });

    /** Visible prompts (limited or all) */
    visiblePrompts = computed(() => {
        const filtered = this.filteredPrompts();
        return this.showAllPrompts() ? filtered : filtered.slice(0, 20);
    });

    // ============== DI & Lifecycle ==============

    private _unsubscribeAll = new Subject<void>();

    constructor(
        private _router: Router,
        private _db: SupabaseDatabaseService
    ) {}

    ngOnInit(): void {
        window['Apex'] = {
            chart: {
                events: {
                    mounted: (chart: any): void => {
                        this._fixSvgFill(chart.el);
                    },
                    updated: (chart: any): void => {
                        this._fixSvgFill(chart.el);
                    },
                },
            },
        };

        this.loadData();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // ============== Public Methods ==============

    loadData(): void {
        this.loading.set(true);
        this.error.set(null);

        const dateRange = this.selectedDateRange();
        const brand = this.selectedBrand();

        forkJoin({
            brands: this._db.fetchBrands(),
            brandVisibility: this._db.fetchBrandVisibility({
                startDate: dateRange.start,
                endDate: dateRange.end,
                brandName: brand === 'all' ? undefined : brand,
            }),
            aiUrls: this._db.fetchAiUrls({
                brandName: brand === 'all' ? undefined : brand,
                limit: 50,
            }),
            llmUsage: this._db.fetchLlmUsage({
                startDate: dateRange.start,
                endDate: dateRange.end,
            }),
            conversations: this._db.fetchConversations({ limit: 200 }),
            prompts: this._db.fetchPrompts({ limit: 500 }),
        })
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.loading.set(false))
            )
            .subscribe({
                next: (results) => {
                    // Set brands from peec_brands (always has data)
                    this._brands.set(results.brands);
                    const brandNames = results.brands.map((b) => b.name);
                    console.log(`📊 Brands aus peec_brands: ${brandNames.join(', ')}`);

                    const visCount = results.brandVisibility.length;
                    console.log(`📊 Brand Visibility History: ${visCount} records`);

                    // Set visibility data (no placeholder fallback — use real brands as empty state)
                    this._brandVisibility.set(results.brandVisibility);
                    this._aiUrls.set(results.aiUrls);
                    this._llmUsage.set(results.llmUsage);
                    this._conversations.set(results.conversations);
                    this._prompts.set(results.prompts);

                    this.dataLoaded.set(true);
                    console.log('✅ GEO AI data loaded successfully');
                },
                error: (err) => {
                    console.error('❌ GEO AI data load failed:', err);
                    this._brands.set([]);
                    this._brandVisibility.set([]);
                    this._aiUrls.set([]);
                    this._llmUsage.set([]);
                    this._conversations.set([]);
                    this._prompts.set([]);
                    this.dataLoaded.set(true);
                    this.error.set(
                        'Verbindung zu Datenbank fehlgeschlagen.'
                    );
                },
            });
    }

    onBrandChange(brand: string): void {
        this.selectedBrand.set(brand);
        this.loadData();
    }

    onDateRangeChange(start: string, end: string): void {
        this.selectedDateRange.set({ start, end });
        this.loadData();
    }

    setQuickRange(days: 7 | 30 | 90): void {
        const start = this._getDateString(-days);
        const end = this._getDateString(0);
        this.onDateRangeChange(start, end);
    }

    getClassificationClass(classification: string | null): string {
        switch (classification) {
            case 'owned':
                return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
            case 'competitor':
                return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
            case 'press':
                return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
            default:
                return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
        }
    }

    getModelCount(row: DomainUsageRow, model: string): number | undefined {
        return row.byModel.find((m) => m.model === model)?.count;
    }

    toggleConversation(chatId: string): void {
        const current = this.expandedConversations();
        const next = new Set(current);
        if (next.has(chatId)) {
            next.delete(chatId);
        } else {
            next.add(chatId);
        }
        this.expandedConversations.set(next);
    }

    isExpanded(chatId: string): boolean {
        return this.expandedConversations().has(chatId);
    }

    getModelLabel(modelId: string | null): string {
        if (!modelId) return 'Unknown';
        const labels: Record<string, string> = {
            'chatgpt-scraper': 'ChatGPT',
            'perplexity-scraper': 'Perplexity',
            'google-ai-overview-scraper': 'Google AI',
            'google-ai-mode-scraper': 'Google AI Mode',
            'gemini-scraper': 'Gemini',
        };
        return labels[modelId] ?? modelId;
    }

    getModelColor(modelId: string | null): string {
        const colors: Record<string, string> = {
            'chatgpt-scraper': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
            'perplexity-scraper': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            'google-ai-overview-scraper': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        };
        return colors[modelId ?? ''] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }

    // ============== Private Methods ==============

    private _getDateString(offsetDays: number): string {
        const date = new Date();
        date.setDate(date.getDate() + offsetDays);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private _extractUrlsFromText(text: string): ExtractedUrl[] {
        const urlRegex = /https?:\/\/([\w.-]+)(\/[^\s\)"'<>]*)?/gi;
        const matches: ExtractedUrl[] = [];
        let match: RegExpExecArray | null;

        while ((match = urlRegex.exec(text)) !== null) {
            const url = match[0].replace(/[.,;)]+$/, '');
            const domain = match[1];

            if (!matches.some((m) => m.url === url)) {
                matches.push({
                    url,
                    domain,
                    sourceMessage: text.substring(
                        Math.max(0, match.index - 20),
                        Math.min(text.length, match.index + 60)
                    ),
                });
            }
        }

        return matches;
    }

    private _fixSvgFill(element: Element): void {
        const currentURL = this._router.url;
        Array.from(element.querySelectorAll('*[fill]'))
            .filter((el) => (el.getAttribute('fill') ?? '').indexOf('url(') !== -1)
            .forEach((el) => {
                const attrVal = el.getAttribute('fill') ?? '';
                el.setAttribute('fill', `url(${currentURL}${attrVal.slice(attrVal.indexOf('#'))})`);
            });
    }
}
