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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { ApexOptions, NgApexchartsModule } from 'ng-apexcharts';
import { Subject, takeUntil, finalize } from 'rxjs';

export interface GeoAiEntry {
    id: string;
    report_date: string;
    brand_id: string;
    brand_name: string;
    visibility: number;
    visibility_percent: number;
    visibility_count: number;
    visibility_total: number;
    position_avg: number | null;
    sentiment_avg: number | null;
    created_at: string;
}

export interface BrandSummary {
    brand_name: string;
    latestVisibility: number;
    previousVisibility: number | null;
    change: number;
    latestPosition: number | null;
    latestSentiment: number | null;
}

@Component({
    selector: 'geo-ai-pack',
    templateUrl: './geo-ai-pack.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        NgApexchartsModule,
        DecimalPipe,
    ],
    schemas: [NO_ERRORS_SCHEMA],
})
export class GeoAiPackComponent implements OnInit, OnDestroy {
    chartVisibility: ApexOptions;

    brands: BrandSummary[] = [];
    totalBrands = 0;
    reportDate = '';
    loading = false;
    error: string | null = null;
    dataLoaded = false;

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private readonly _webhookUrl = 'https://n8n.eom.de/webhook/geo-ai';

    constructor(
        private _router: Router,
        private _http: HttpClient,
        private _cdr: ChangeDetectorRef,
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
                    console.error('Failed to load GEO AI data:', err);
                    this.error = 'Daten konnten nicht geladen werden. Bitte versuche es erneut.';
                    this._cdr.markForCheck();
                },
            });
    }

    private _processData(raw: any): void {
        const entries: GeoAiEntry[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
        if (!entries.length) {
            this.error = 'Keine Daten vom Webhook erhalten.';
            return;
        }

        // Deduplicate by id
        const seen = new Set<string>();
        const deduplicated: GeoAiEntry[] = [];
        for (const entry of entries) {
            if (entry.id && !seen.has(entry.id)) {
                seen.add(entry.id);
                deduplicated.push(entry);
            }
        }

        // Get all unique dates sorted ascending
        const allDates = [...new Set(deduplicated.map(e => e.report_date))].sort();
        this.reportDate = allDates[allDates.length - 1];

        // Group by brand
        const brandMap = new Map<string, Map<string, GeoAiEntry>>();
        for (const entry of deduplicated) {
            if (!brandMap.has(entry.brand_name)) {
                brandMap.set(entry.brand_name, new Map());
            }
            brandMap.get(entry.brand_name)!.set(entry.report_date, entry);
        }

        this.totalBrands = brandMap.size;

        // Build brand summaries
        const latestDate = allDates[allDates.length - 1];
        const previousDate = allDates.length >= 2 ? allDates[allDates.length - 2] : null;

        this.brands = [];
        for (const [brandName, dateMap] of brandMap) {
            const latest = dateMap.get(latestDate);
            const previous = previousDate ? dateMap.get(previousDate) : null;

            const latestVis = latest?.visibility_percent ?? 0;
            const prevVis = previous?.visibility_percent ?? null;
            const change = prevVis !== null && prevVis > 0
                ? Math.round(((latestVis - prevVis) / prevVis) * 100) / 10
                : 0;

            this.brands.push({
                brand_name: brandName,
                latestVisibility: latestVis,
                previousVisibility: prevVis,
                change,
                latestPosition: latest?.position_avg ?? null,
                latestSentiment: latest?.sentiment_avg ?? null,
            });
        }

        // Sort by latest visibility descending
        this.brands.sort((a, b) => b.latestVisibility - a.latestVisibility);

        // Build chart series - one area line per brand
        const colors = ['#10B981', '#818CF8', '#FB7185', '#38BDF8', '#FBBF24', '#A78BFA', '#F472B6', '#34D399', '#F97316'];
        const series: { name: string; data: number[] }[] = [];

        for (const brand of this.brands) {
            const dateMap = brandMap.get(brand.brand_name)!;
            series.push({
                name: brand.brand_name,
                data: allDates.map(date => {
                    const entry = dateMap.get(date);
                    return entry ? Math.round(entry.visibility_percent * 100) / 100 : 0;
                }),
            });
        }

        const categories = allDates.map(d => {
            const date = new Date(d + 'T00:00:00');
            return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        });

        this.chartVisibility = {
            chart: {
                type: 'area',
                height: 420,
                fontFamily: 'inherit',
                foreColor: 'inherit',
                toolbar: { show: false },
                zoom: { enabled: false },
            },
            colors: colors.slice(0, series.length),
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
            series,
            stroke: { width: 2.5, curve: 'smooth' },
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
                    formatter: (val: number): string => val != null ? val.toFixed(1) + '%' : '-',
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
                    let html = `<div style="padding:8px 12px;font-size:13px;">`;
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
                    formatter: (val: number): string => val != null ? val.toFixed(0) + '%' : '',
                },
            },
        };

        this.dataLoaded = true;
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
