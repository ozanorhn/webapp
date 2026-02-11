import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
    selector: 'app-analytics',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatSelectModule,
        MatFormFieldModule,
        MatProgressBarModule,
        MatTabsModule,
    ],
    templateUrl: './analytics.component.html',
    styleUrls: ['./analytics.component.scss'],
})
export class AnalyticsComponent {
    selectedPeriod = '7d';

    trafficStats = [
        { label: 'Besucher', value: '45.2K', change: '+12%', trend: 'up' },
        { label: 'Seitenaufrufe', value: '128.5K', change: '+8%', trend: 'up' },
        {
            label: 'Absprungrate',
            value: '32.8%',
            change: '-2.1%',
            trend: 'down',
        },
        {
            label: ' Sitzungsdauer',
            value: '2m 45s',
            change: '+18s',
            trend: 'up',
        },
    ];

    trafficSources = [
        {
            source: 'Organic Search',
            visitors: 18200,
            percentage: 40,
            color: '#10b981',
        },
        { source: 'Direct', visitors: 11300, percentage: 25, color: '#3b82f6' },
        {
            source: 'Social Media',
            visitors: 8100,
            percentage: 18,
            color: '#8b5cf6',
        },
        {
            source: 'Referral',
            visitors: 6350,
            percentage: 14,
            color: '#f59e0b',
        },
        { source: 'Email', visitors: 1350, percentage: 3, color: '#ef4444' },
    ];

    topPages = [
        {
            page: '/dashboard',
            views: 15200,
            unique: 8900,
            avgTime: '3m 12s',
            bounceRate: '28%',
        },
        {
            page: '/analytics',
            views: 12400,
            unique: 7200,
            avgTime: '2m 45s',
            bounceRate: '35%',
        },
        {
            page: '/seo-tools',
            views: 9800,
            unique: 5600,
            avgTime: '4m 05s',
            bounceRate: '22%',
        },
        {
            page: '/reports',
            views: 7600,
            unique: 4100,
            avgTime: '1m 58s',
            bounceRate: '42%',
        },
        {
            page: '/settings',
            views: 3200,
            unique: 1800,
            avgTime: '1m 30s',
            bounceRate: '65%',
        },
    ];

    deviceStats = {
        desktop: { users: 26700, percentage: 59 },
        mobile: { users: 16200, percentage: 36 },
        tablet: { users: 2250, percentage: 5 },
    };

    conversionFunnel = [
        { stage: 'Besucher', count: 45200, dropoff: 0 },
        { stage: 'Registriert', count: 12800, dropoff: 71.7 },
        { stage: 'Aktiviert', count: 9100, dropoff: 28.9 },
        { stage: 'Kauf', count: 2736, dropoff: 69.9 },
        { stage: 'Wiederholung', count: 1370, dropoff: 49.9 },
    ];

    getPieRotation(index: number): string {
        if (index === 0) {
            return 'rotate(0deg)';
        }
        const previousSources = this.trafficSources.slice(0, index);
        const sumPercentage = previousSources.reduce(
            (sum, source) => sum + source.percentage,
            0
        );
        const rotation = sumPercentage * 3.6;
        return `rotate(${rotation}deg)`;
    }
}
