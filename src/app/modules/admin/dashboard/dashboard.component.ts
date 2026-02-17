import { DecimalPipe, DatePipe } from '@angular/common';
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

export interface ReportPageEntry {
    id: string;
    report_date: string;
    dimension_type: string;
    dimension_value: string;
    sessions: number;
    leads: number;
    conversion_rate: number;
    created_at: string;
}

export interface ReportSourceEntry {
    id: string;
    report_date: string;
    source: string;
    sessions: number;
    leads: number;
    conversion_rate: number;
    created_at: string;
}

export interface ReportSummaryEntry {
    id: string;
    report_date: string;
    total_sessions: number;
    total_leads: number;
    conversion_rate: number;
    created_at: string;
}

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

@Component({
    selector: 'dashboard',
    templateUrl: './dashboard.component.html',
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
        DatePipe,
    ],
    schemas: [NO_ERRORS_SCHEMA],
})
export class DashboardComponent implements OnInit, OnDestroy {
    chartTopPages: ApexOptions;
    chartSources: ApexOptions;

    pageData: ReportPageEntry[] = [];
    sourceData: ReportSourceEntry[] = [];
    summary: ReportSummaryEntry | null = null;
    reportDate: string = '';

    topWinners: KeywordEntry[] = [];
    topLosers: KeywordEntry[] = [];
    keywordsLoading = false;
    keywordsError: string | null = null;

    loading = false;
    error: string | null = null;

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private readonly _webhookUrl = 'https://n8n.eom.de/webhook/report';

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

        this.loadReport();
        this._loadKeywords();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    loadReport(): void {
        this.loading = true;
        this.error = null;
        this._cdr.markForCheck();

        this._http.get<any[]>(this._webhookUrl)
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
                    this._prepareCharts();
                    this._cdr.markForCheck();
                },
                error: (err) => {
                    console.error('Failed to load report data:', err);
                    this.error = 'Daten konnten nicht geladen werden. Bitte versuche es erneut.';
                    this._cdr.markForCheck();
                },
            });
    }

    private _processData(raw: any): void {
        this.pageData = [];
        this.sourceData = [];
        this.summary = null;

        // Handle different response formats
        const entries: any[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
        if (!entries.length) {
            this.error = 'Keine Daten vom Webhook erhalten.';
            return;
        }

        for (const entry of entries) {
            // Summary entry (has total_sessions)
            if (entry.total_sessions !== undefined) {
                this.summary = entry;
                this.reportDate = entry.report_date;
                continue;
            }

            // Page data (has dimension_type)
            if (entry.dimension_type === 'page') {
                if (entry.dimension_value === 'TOTAL') {
                    continue; // skip TOTAL row for pages, we use summary
                }
                this.pageData.push(entry);
                if (!this.reportDate) {
                    this.reportDate = entry.report_date;
                }
                continue;
            }

            // Source data (has source)
            if (entry.source !== undefined) {
                if (entry.source === 'TOTAL') {
                    continue; // skip TOTAL row for sources, we use summary
                }
                this.sourceData.push(entry);
                continue;
            }
        }

        // Sort by sessions descending
        this.pageData.sort((a, b) => b.sessions - a.sessions);
        this.sourceData.sort((a, b) => b.sessions - a.sessions);
    }

    private _prepareCharts(): void {
        // Top 10 pages bar chart
        const topPages = this.pageData.slice(0, 10);
        const pageLabels = topPages.map(p => {
            const val = p.dimension_value || '(leer)';
            return val === '(not set)' ? '(nicht gesetzt)' : val;
        });
        const pageSessions = topPages.map(p => p.sessions);
        const pageLeads = topPages.map(p => p.leads);

        this.chartTopPages = {
            chart: {
                type: 'bar',
                height: '100%',
                fontFamily: 'inherit',
                foreColor: 'inherit',
                toolbar: { show: false },
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    borderRadius: 4,
                    columnWidth: '60%',
                },
            },
            colors: ['#818CF8', '#34D399'],
            series: [
                { name: 'Sessions', data: pageSessions },
                { name: 'Leads', data: pageLeads },
            ],
            xaxis: {
                categories: pageLabels,
                labels: { style: { colors: '#94A3B8' } },
            },
            yaxis: {
                labels: {
                    style: { colors: '#94A3B8' },
                    maxWidth: 200,
                },
            },
            legend: {
                labels: { colors: '#94A3B8' },
            },
            dataLabels: { enabled: false },
            grid: {
                borderColor: '#334155',
            },
            tooltip: {
                theme: 'dark',
            },
        };

        // Sources donut chart
        const sourceLabels = this.sourceData.map(s => s.source);
        const sourceSessions = this.sourceData.map(s => s.sessions);

        this.chartSources = {
            chart: {
                type: 'donut',
                height: '100%',
                fontFamily: 'inherit',
                foreColor: 'inherit',
            },
            colors: ['#818CF8', '#38BDF8', '#34D399', '#FB7185', '#FBBF24', '#A78BFA', '#F472B6', '#2DD4BF', '#F97316', '#94A3B8', '#64748B', '#E879F9'],
            series: sourceSessions,
            labels: sourceLabels,
            legend: {
                position: 'bottom',
                labels: { colors: '#94A3B8' },
            },
            dataLabels: {
                enabled: true,
                formatter: (val: number): string => `${val.toFixed(1)}%`,
            },
            tooltip: {
                theme: 'dark',
                y: {
                    formatter: (val: number): string => `${val} Sessions`,
                },
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '65%',
                        labels: {
                            show: true,
                            name: { show: true, color: '#94A3B8' },
                            value: { show: true, color: '#CBD5E1', formatter: (val: string): string => `${val} Sessions` },
                            total: {
                                show: true,
                                label: 'Gesamt',
                                color: '#94A3B8',
                                formatter: (w: any): string => {
                                    const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                                    return `${total}`;
                                },
                            },
                        },
                    },
                },
            },
        };
    }

    private _loadKeywords(): void {
        this.keywordsLoading = true;
        this.keywordsError = null;
        this._cdr.markForCheck();

        this._http.get<KeywordEntry[]>(this._webhookUrl)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => {
                    this.keywordsLoading = false;
                    this._cdr.markForCheck();
                }),
            )
            .subscribe({
                next: (data) => {
                    const entries: KeywordEntry[] = Array.isArray(data) ? data : [];

                    this.topWinners = entries
                        .filter(e => e.status === 'improved' && e.diff !== null && e.diff > 0)
                        .sort((a, b) => b.diff! - a.diff!)
                        .slice(0, 5);

                    this.topLosers = entries
                        .filter(e => e.status === 'dropped' && e.diff !== null && e.diff < 0)
                        .sort((a, b) => a.diff! - b.diff!)
                        .slice(0, 5);

                    this._cdr.markForCheck();
                },
                error: (err) => {
                    console.error('Failed to load keyword data:', err);
                    this.keywordsError = 'Keyword-Daten konnten nicht geladen werden.';
                    this._cdr.markForCheck();
                },
            });
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
