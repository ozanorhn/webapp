import { DecimalPipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
    NO_ERRORS_SCHEMA,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { ApexOptions, NgApexchartsModule } from 'ng-apexcharts';
import { Subject, takeUntil, finalize } from 'rxjs';

export interface KeywordEntry {
    id: string;
    report_date: string;
    keyword: string;
    current_position: number | null;
    last_position: number | null;
    diff: number | null;
    percent_change: number | null;
    status: string;
    search_volume_current: number | null;
    search_volume_last: number | null;
    created_at: string;
}

export interface VisibilityEntry {
    id: string;
    report_date: string;
    domain: string;
    visibility: number;
    created_at: string;
}

export interface CompetitorData {
    domain: string;
    currentVisibility: number;
    previousVisibility: number | null;
    change: number;
}

@Component({
    selector: 'sistrix',
    templateUrl: './sistrix.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatTooltipModule,
        MatProgressSpinnerModule,
        NgApexchartsModule,
        DecimalPipe,
    ],
    schemas: [NO_ERRORS_SCHEMA],
})
export class SistrixComponent implements OnInit, OnDestroy {
    chartVisibility: ApexOptions;

    // KPIs
    totalKeywords = 0;
    top10Keywords = 0;
    improvedKeywords = 0;
    droppedKeywords = 0;
    newKeywords = 0;
    lostKeywords = 0;
    ownVisibility = 0;
    ownVisibilityChange = 0;

    // All keyword entries for the table
    allKeywords: KeywordEntry[] = [];

    // Top Winners & Losers
    topWinners: KeywordEntry[] = [];
    topLosers: KeywordEntry[] = [];

    // Competitors
    competitors: CompetitorData[] = [];
    ownDomain = 'eom.de';

    loading = false;
    error: string | null = null;
    reportDate: string = '';
    dataLoaded = false;

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private readonly _webhookUrl = 'https://n8n.eom.de/webhook/sistrixdaten';

    constructor(
        private _router: Router,
        private _http: HttpClient,
        private _cdr: ChangeDetectorRef,
    ) {}

    ngOnInit(): void {
        window['Apex'] = {
            chart: {
                events: {
                    mounted: (chart: any, options?: any): void => {
                        this._fixSvgFill(chart.el);
                    },
                    updated: (chart: any, options?: any): void => {
                        this._fixSvgFill(chart.el);
                    },
                },
            },
        };

        this.loadData();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    loadData(): void {
        this.loading = true;
        this.error = null;
        this._cdr.markForCheck();

        this._http.get<any>(this._webhookUrl)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => {
                    this.loading = false;
                    this._cdr.markForCheck();
                }),
            )
            .subscribe({
                next: (data) => {
                    this._processData(data);
                    this._cdr.markForCheck();
                },
                error: (err) => {
                    console.error('Failed to load Sistrix data:', err);
                    this.error = 'Daten konnten nicht geladen werden. Bitte versuche es erneut.';
                    this._cdr.markForCheck();
                },
            });
    }

    private _processData(raw: any): void {
        const entries: any[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
        if (!entries.length) {
            this.error = 'Keine Daten vom Webhook erhalten.';
            return;
        }

        // Deduplicate by id
        const seen = new Set<string>();
        const deduplicated: any[] = [];
        for (const entry of entries) {
            if (entry.id && !seen.has(entry.id)) {
                seen.add(entry.id);
                deduplicated.push(entry);
            }
        }

        // Separate visibility entries (have domain + visibility) from keyword entries (have keyword)
        const visibilityEntries: VisibilityEntry[] = [];
        const keywords: KeywordEntry[] = [];

        for (const entry of deduplicated) {
            if (entry.domain !== undefined && entry.visibility !== undefined) {
                visibilityEntries.push(entry);
            } else if (entry.keyword !== undefined) {
                keywords.push(entry);
            }
        }

        // --- Process Keywords ---
        if (keywords.length > 0) {
            this.reportDate = keywords[0].report_date;
        }

        this.totalKeywords = keywords.filter(k => k.current_position !== null).length;
        this.top10Keywords = keywords.filter(k => k.current_position !== null && k.current_position <= 10).length;
        this.improvedKeywords = keywords.filter(k => k.status === 'improved').length;
        this.droppedKeywords = keywords.filter(k => k.status === 'dropped').length;
        this.newKeywords = keywords.filter(k => k.status === 'new').length;
        this.lostKeywords = keywords.filter(k => k.status === 'lost').length;

        this.allKeywords = [...keywords]
            .filter(k => k.current_position !== null)
            .sort((a, b) => a.current_position! - b.current_position!);

        this.topWinners = keywords
            .filter(e => e.status === 'improved' && e.diff !== null && e.diff > 0)
            .sort((a, b) => b.diff! - a.diff!)
            .slice(0, 5);

        this.topLosers = keywords
            .filter(e => e.status === 'dropped' && e.diff !== null && e.diff < 0)
            .sort((a, b) => a.diff! - b.diff!)
            .slice(0, 5);

        // --- Process Visibility Data ---
        if (visibilityEntries.length > 0) {
            this._processVisibility(visibilityEntries);
        }

        this.dataLoaded = true;
    }

    private _processVisibility(entries: VisibilityEntry[]): void {
        // Deduplicate by domain+date (webhook may send duplicates with different IDs)
        const domainDateMap = new Map<string, VisibilityEntry>();
        for (const entry of entries) {
            const key = `${entry.domain}__${entry.report_date}`;
            if (!domainDateMap.has(key)) {
                domainDateMap.set(key, entry);
            }
        }
        const uniqueEntries = [...domainDateMap.values()];

        // Group by domain
        const domainMap = new Map<string, { date: string; visibility: number }[]>();
        for (const entry of uniqueEntries) {
            if (!domainMap.has(entry.domain)) {
                domainMap.set(entry.domain, []);
            }
            domainMap.get(entry.domain)!.push({
                date: entry.report_date,
                visibility: entry.visibility,
            });
        }

        // Sort each domain's data by date ascending
        for (const [, data] of domainMap) {
            data.sort((a, b) => a.date.localeCompare(b.date));
        }

        // Get all unique dates sorted
        const allDates = [...new Set(uniqueEntries.map(e => e.report_date))].sort();

        // Own domain visibility (latest and previous for change calculation)
        const ownData = domainMap.get(this.ownDomain);
        if (ownData && ownData.length > 0) {
            this.ownVisibility = ownData[ownData.length - 1].visibility;
            if (ownData.length >= 2) {
                const prev = ownData[ownData.length - 2].visibility;
                this.ownVisibilityChange = prev > 0
                    ? Math.round(((this.ownVisibility - prev) / prev) * 1000) / 10
                    : 0;
            }
        }

        // Build competitor comparison (latest vs previous date)
        const latestDate = allDates[allDates.length - 1];
        const previousDate = allDates.length >= 2 ? allDates[allDates.length - 2] : null;

        this.competitors = [];
        for (const [domain, data] of domainMap) {
            if (domain === this.ownDomain) continue;

            const latestEntry = data.find(d => d.date === latestDate);
            const prevEntry = previousDate ? data.find(d => d.date === previousDate) : null;

            if (latestEntry) {
                const change = prevEntry && prevEntry.visibility > 0
                    ? Math.round(((latestEntry.visibility - prevEntry.visibility) / prevEntry.visibility) * 1000) / 10
                    : 0;

                this.competitors.push({
                    domain,
                    currentVisibility: latestEntry.visibility,
                    previousVisibility: prevEntry?.visibility ?? null,
                    change,
                });
            }
        }

        // Sort competitors by visibility descending
        this.competitors.sort((a, b) => b.currentVisibility - a.currentVisibility);

        // Build Visibility Chart series - one line per domain
        const series: { name: string; data: number[] }[] = [];

        // Own domain first (highlighted)
        if (domainMap.has(this.ownDomain)) {
            series.push({
                name: this.ownDomain,
                data: allDates.map(date => {
                    const entry = domainMap.get(this.ownDomain)!.find(d => d.date === date);
                    return entry ? Math.round(entry.visibility * 100) / 100 : 0;
                }),
            });
        }

        // All competitor domains
        for (const comp of this.competitors) {
            if (domainMap.has(comp.domain)) {
                series.push({
                    name: comp.domain,
                    data: allDates.map(date => {
                        const entry = domainMap.get(comp.domain)!.find(d => d.date === date);
                        return entry ? Math.round(entry.visibility * 100) / 100 : 0;
                    }),
                });
            }
        }

        // Format dates for x-axis labels
        const categories = allDates.map(d => {
            const date = new Date(d + 'T00:00:00');
            return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        });

        this._prepareChartData(series, categories);
    }

    private _prepareChartData(series: { name: string; data: number[] }[], categories: string[]): void {
        this.chartVisibility = {
            chart: {
                type: 'line',
                height: 380,
                fontFamily: 'inherit',
                foreColor: 'inherit',
                toolbar: { show: false },
                zoom: { enabled: false },
            },
            colors: ['#10B981', '#818CF8', '#FB7185', '#38BDF8', '#FBBF24', '#A78BFA', '#F472B6'],
            dataLabels: { enabled: false },
            grid: {
                show: true,
                borderColor: 'rgba(51,65,85,0.15)',
                xaxis: { lines: { show: false } },
                yaxis: { lines: { show: true } },
            },
            series,
            stroke: { width: 2, curve: 'smooth' },
            markers: {
                size: 4,
                hover: { size: 7 },
            },
            legend: {
                show: true,
                position: 'top',
                labels: { colors: '#94A3B8' },
            },
            tooltip: {
                theme: 'dark',
                shared: true,
                intersect: false,
                y: {
                    formatter: (val: number): string => val != null ? val.toFixed(2) : '-',
                },
                custom: ({ series: s, seriesIndex, dataPointIndex, w }): string => {
                    // Sort all series by value descending for this data point
                    const items = w.config.series
                        .map((ser: any, i: number) => ({
                            name: ser.name,
                            value: s[i][dataPointIndex],
                            color: w.config.colors[i],
                        }))
                        .filter((item: any) => item.value != null)
                        .sort((a: any, b: any) => b.value - a.value);

                    const cats = w.config.xaxis?.categories ?? w.globals?.categoryLabels ?? [];
                    const date = cats[dataPointIndex] ?? w.globals?.labels?.[dataPointIndex] ?? '';
                    let html = `<div style="padding:8px 12px;font-size:13px;">`;
                    html += `<div style="font-weight:600;margin-bottom:6px;color:#CBD5E1;">${date}</div>`;
                    for (const item of items) {
                        html += `<div style="display:flex;align-items:center;gap:8px;padding:2px 0;">`;
                        html += `<span style="width:10px;height:10px;border-radius:50%;background:${item.color};display:inline-block;"></span>`;
                        html += `<span style="flex:1;color:#94A3B8;">${item.name}</span>`;
                        html += `<span style="font-weight:600;color:#E2E8F0;margin-left:12px;">${item.value.toFixed(2)}</span>`;
                        html += `</div>`;
                    }
                    html += `</div>`;
                    return html;
                },
            },
            xaxis: {
                categories,
                labels: {
                    style: { colors: '#CBD5E1' },
                },
                axisBorder: { show: false },
                axisTicks: { show: false },
            },
            yaxis: {
                show: true,
                labels: {
                    style: { colors: '#94A3B8' },
                    formatter: (val: number): string => val != null ? Math.round(val).toString() : '',
                },
            },
        };
    }

    private _fixSvgFill(element: Element): void {
        const currentURL = this._router.url;
        Array.from(element.querySelectorAll('*[fill]'))
            .filter((el) => el.getAttribute('fill').indexOf('url(') !== -1)
            .forEach((el) => {
                const attrVal = el.getAttribute('fill');
                el.setAttribute('fill', `url(${currentURL}${attrVal.slice(attrVal.indexOf('#'))}`);
            });
    }
}
