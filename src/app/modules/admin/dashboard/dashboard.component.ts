import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatGridListModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
    kpiData = [
        { title: 'Gesamtbesucher', value: '45.2K', change: '+12%', trend: 'up', icon: 'trending_up' },
        { title: 'Seitenaufrufe', value: '128.5K', change: '+8%', trend: 'up', icon: 'visibility' },
        { title: 'Conversion Rate', value: '3.2%', change: '-0.5%', trend: 'down', icon: 'percent' },
        { title: 'Avg. Session Duration', value: '2m 45s', change: '+18s', trend: 'up', icon: 'schedule' }
    ];

    recentActivities = [
        { type: 'success', message: 'SEO-Kampagne "Q1 2024" gestartet', time: 'vor 2 Stunden' },
        { type: 'warning', message: 'Keyword-Ranking für "Angular UI" gefallen', time: 'vor 4 Stunden' },
        { type: 'info', message: 'Neuer Analytics-Bericht verfügbar', time: 'vor 6 Stunden' },
        { type: 'success', message: 'Mobile Performance optimiert', time: 'vor 8 Stunden' }
    ];
}