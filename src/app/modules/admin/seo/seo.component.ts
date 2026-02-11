import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
    selector: 'app-seo',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatCardModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatProgressBarModule,
        MatChipsModule,
        MatInputModule,
        MatSelectModule,
        MatFormFieldModule
    ],
    templateUrl: './seo.component.html',
    styleUrls: ['./seo.component.scss']
})
export class SeoComponent {
    keywordsData = [
        { keyword: 'angular dashboard', position: 3, searchVolume: '12.5K', competition: 'High', trend: 'up', change: '+2' },
        { keyword: 'admin template', position: 8, searchVolume: '28.3K', competition: 'Medium', trend: 'up', change: '+1' },
        { keyword: 'material ui angular', position: 5, searchVolume: '8.7K', competition: 'High', trend: 'down', change: '-1' },
        { keyword: 'dark mode dashboard', position: 2, searchVolume: '15.2K', competition: 'Medium', trend: 'up', change: '+3' },
        { keyword: 'responsive admin panel', position: 12, searchVolume: '6.8K', competition: 'Low', trend: 'up', change: '+4' }
    ];

    displayedColumns = ['keyword', 'position', 'searchVolume', 'competition', 'trend', 'actions'];

    pageSpeed = {
        desktop: 92,
        mobile: 85,
        accessibility: 94,
        bestPractices: 88
    };

    backlinks = [
        { source: 'techblog.com', domainAuthority: 78, traffic: '2.5K', status: 'active' },
        { source: 'webdev.io', domainAuthority: 65, traffic: '1.8K', status: 'active' },
        { source: 'angular-lab.com', domainAuthority: 82, traffic: '3.2K', status: 'pending' }
    ];

    selectedFilter = 'all';
}