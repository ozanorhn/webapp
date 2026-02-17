import { DecimalPipe, PercentPipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
    NO_ERRORS_SCHEMA,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { ApexOptions, NgApexchartsModule } from 'ng-apexcharts';
import { Subject } from 'rxjs';

@Component({
    selector: 'analytics',
    templateUrl: './analytics.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatTooltipModule,
        NgApexchartsModule,
        DecimalPipe,
        PercentPipe,
    ],
    schemas: [NO_ERRORS_SCHEMA],
})
export class AnalyticsComponent implements OnInit, OnDestroy {
    chartVisitors: ApexOptions;
    chartDevices: ApexOptions;
    chartBrowsers: ApexOptions;
    chartOS: ApexOptions;
    data: any;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(private _router: Router) {
        this._initializeData();
    }

    ngOnInit(): void {
        this._prepareChartData();

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
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    trackByFn(index: number, item: any): any {
        return item.id || index;
    }

    private _initializeData(): void {
        this.data = {
            kpis: {
                sessions: { value: 28456, change: 12.5 },
                bounceRate: { value: 42.3, change: -3.2 },
                sessionDuration: { value: '3m 24s', change: 8.1 },
                pagesPerSession: { value: 4.2, change: 5.7 },
            },
            topPages: [
                { path: '/', title: 'Homepage', sessions: 8542, percentage: 30 },
                { path: '/products', title: 'Products', sessions: 5234, percentage: 18.4 },
                { path: '/pricing', title: 'Pricing', sessions: 4128, percentage: 14.5 },
                { path: '/blog', title: 'Blog', sessions: 3456, percentage: 12.1 },
                { path: '/about', title: 'About Us', sessions: 2890, percentage: 10.2 },
                { path: '/contact', title: 'Contact', sessions: 2134, percentage: 7.5 },
                { path: '/docs', title: 'Documentation', sessions: 1567, percentage: 5.5 },
                { path: '/careers', title: 'Careers', sessions: 505, percentage: 1.8 },
            ],
            devices: {
                labels: ['Desktop', 'Mobile', 'Tablet'],
                series: [58, 34, 8],
            },
            browsers: {
                labels: ['Chrome', 'Safari', 'Firefox', 'Edge', 'Other'],
                series: [64, 19, 8, 6, 3],
            },
            os: {
                labels: ['Windows', 'macOS', 'iOS', 'Android', 'Linux'],
                series: [42, 28, 15, 12, 3],
            },
            visitors: {
                series: [
                    { name: 'Visitors', data: [4200, 4800, 4500, 5200, 5800, 5400, 6100, 5900, 6500, 7200, 6800, 7500, 8100, 7800] },
                    { name: 'Page Views', data: [8400, 9600, 9000, 10400, 11600, 10800, 12200, 11800, 13000, 14400, 13600, 15000, 16200, 15600] },
                ],
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

    private _prepareChartData(): void {
        this.chartVisitors = {
            chart: {
                animations: { speed: 400, animateGradually: { enabled: false } },
                fontFamily: 'inherit',
                foreColor: 'inherit',
                width: '100%',
                height: '100%',
                type: 'area',
                toolbar: { show: false },
                zoom: { enabled: false },
            },
            colors: ['#818CF8', '#C084FC'],
            dataLabels: { enabled: false },
            fill: { colors: ['#312E81', '#581C87'], opacity: 0.5 },
            grid: {
                show: true,
                borderColor: '#334155',
                padding: { top: 10, bottom: -40, left: 0, right: 0 },
                position: 'back',
                xaxis: { lines: { show: true } },
            },
            series: this.data.visitors.series,
            stroke: { width: 2 },
            tooltip: {
                followCursor: true,
                theme: 'dark',
                x: { format: 'MMM dd' },
                y: { formatter: (value: number): string => `${value.toLocaleString()}` },
            },
            xaxis: {
                axisBorder: { show: false },
                axisTicks: { show: false },
                crosshairs: { stroke: { color: '#475569', dashArray: 0, width: 2 } },
                labels: { offsetY: -20, style: { colors: '#CBD5E1' } },
                tickAmount: 14,
                tooltip: { enabled: false },
                categories: ['Jan 1', 'Jan 8', 'Jan 15', 'Jan 22', 'Jan 29', 'Feb 5', 'Feb 12', 'Feb 19', 'Feb 26', 'Mar 5', 'Mar 12', 'Mar 19', 'Mar 26', 'Apr 2'],
            },
            yaxis: {
                axisTicks: { show: false },
                axisBorder: { show: false },
                min: (min): number => min - 2000,
                max: (max): number => max + 2000,
                tickAmount: 5,
                show: false,
            },
        };

        this.chartDevices = {
            chart: {
                animations: { speed: 400, animateGradually: { enabled: false } },
                fontFamily: 'inherit',
                foreColor: 'inherit',
                height: '100%',
                type: 'donut',
                sparkline: { enabled: true },
            },
            colors: ['#3182CE', '#63B3ED', '#BEE3F8'],
            labels: this.data.devices.labels,
            plotOptions: {
                pie: { customScale: 0.9, expandOnClick: false, donut: { size: '70%' } },
            },
            series: this.data.devices.series,
            states: {
                hover: { filter: { type: 'none' } },
                active: { filter: { type: 'none' } },
            },
            tooltip: {
                enabled: true,
                fillSeriesColor: false,
                theme: 'dark',
                custom: ({ seriesIndex, w }): string =>
                    `<div class="flex items-center h-8 min-h-8 max-h-8 px-3">
                        <div class="w-3 h-3 rounded-full" style="background-color: ${w.config.colors[seriesIndex]};"></div>
                        <div class="ml-2 text-md leading-none">${w.config.labels[seriesIndex]}:</div>
                        <div class="ml-2 text-md font-bold leading-none">${w.config.series[seriesIndex]}%</div>
                    </div>`,
            },
        };

        this.chartBrowsers = {
            chart: {
                animations: { speed: 400, animateGradually: { enabled: false } },
                fontFamily: 'inherit',
                foreColor: 'inherit',
                height: '100%',
                type: 'donut',
                sparkline: { enabled: true },
            },
            colors: ['#319795', '#4FD1C5', '#81E6D9', '#B2F5EA', '#E6FFFA'],
            labels: this.data.browsers.labels,
            plotOptions: {
                pie: { customScale: 0.9, expandOnClick: false, donut: { size: '70%' } },
            },
            series: this.data.browsers.series,
            states: {
                hover: { filter: { type: 'none' } },
                active: { filter: { type: 'none' } },
            },
            tooltip: {
                enabled: true,
                fillSeriesColor: false,
                theme: 'dark',
                custom: ({ seriesIndex, w }): string =>
                    `<div class="flex items-center h-8 min-h-8 max-h-8 px-3">
                        <div class="w-3 h-3 rounded-full" style="background-color: ${w.config.colors[seriesIndex]};"></div>
                        <div class="ml-2 text-md leading-none">${w.config.labels[seriesIndex]}:</div>
                        <div class="ml-2 text-md font-bold leading-none">${w.config.series[seriesIndex]}%</div>
                    </div>`,
            },
        };

        this.chartOS = {
            chart: {
                animations: { speed: 400, animateGradually: { enabled: false } },
                fontFamily: 'inherit',
                foreColor: 'inherit',
                height: '100%',
                type: 'donut',
                sparkline: { enabled: true },
            },
            colors: ['#805AD5', '#B794F4', '#D6BCFA', '#E9D8FD', '#FAF5FF'],
            labels: this.data.os.labels,
            plotOptions: {
                pie: { customScale: 0.9, expandOnClick: false, donut: { size: '70%' } },
            },
            series: this.data.os.series,
            states: {
                hover: { filter: { type: 'none' } },
                active: { filter: { type: 'none' } },
            },
            tooltip: {
                enabled: true,
                fillSeriesColor: false,
                theme: 'dark',
                custom: ({ seriesIndex, w }): string =>
                    `<div class="flex items-center h-8 min-h-8 max-h-8 px-3">
                        <div class="w-3 h-3 rounded-full" style="background-color: ${w.config.colors[seriesIndex]};"></div>
                        <div class="ml-2 text-md leading-none">${w.config.labels[seriesIndex]}:</div>
                        <div class="ml-2 text-md font-bold leading-none">${w.config.series[seriesIndex]}%</div>
                    </div>`,
            },
        };
    }
}
