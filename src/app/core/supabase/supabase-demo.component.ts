/**
 * DEMO COMPONENT - Zeigt die Supabase Integration
 *
 * Nutzen:
 * 1. Im Template: <app-supabase-demo></app-supabase-demo>
 * 2. Oder als Referenz für deine eigenen Komponenten
 */

import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { Subject, takeUntil } from 'rxjs';
import { SupabaseDatabaseService } from './supabase-database.service';
import { SupabaseService } from './supabase.service';
import { GA4MonthlyReport, PeecBrand, SEOKeywordRanking } from './supabase.types';

@Component({
    selector: 'app-supabase-demo',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatProgressSpinnerModule, MatCardModule],
    template: `
        <div class="p-6">
            <h2 class="mb-6 text-2xl font-bold">Supabase Integration Demo</h2>

            <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <button
                    mat-raised-button
                    color="primary"
                    (click)="loadGA4Data()"
                    [disabled]="loading"
                >
                    GA4 Daten laden
                </button>

                <button
                    mat-raised-button
                    color="accent"
                    (click)="loadPeecBrands()"
                    [disabled]="loading"
                >
                    Peec Brands laden
                </button>

                <button
                    mat-raised-button
                    color="warn"
                    (click)="loadSEOKeywords()"
                    [disabled]="loading"
                >
                    SEO Keywords laden
                </button>

                <button mat-raised-button (click)="clearData()">Daten löschen</button>
            </div>

            <div *ngIf="loading" class="flex justify-center py-8">
                <mat-spinner [diameter]="40"></mat-spinner>
            </div>

            <!-- GA4 Data -->
            <mat-card *ngIf="ga4Data.length > 0" class="mb-4">
                <mat-card-header>
                    <mat-card-title>GA4 Monthly Report ({{ ga4Data.length }})</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-100">
                                <tr>
                                    <th class="px-4 py-2 text-left">Date</th>
                                    <th class="px-4 py-2 text-left">Dimension</th>
                                    <th class="px-4 py-2 text-right">Sessions</th>
                                    <th class="px-4 py-2 text-right">Leads</th>
                                    <th class="px-4 py-2 text-right">Conv. Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr *ngFor="let item of ga4Data.slice(0, 10)" class="border-b">
                                    <td class="px-4 py-2">{{ item.report_date }}</td>
                                    <td class="px-4 py-2">{{ item.dimension_value }}</td>
                                    <td class="px-4 py-2 text-right">{{ item.sessions }}</td>
                                    <td class="px-4 py-2 text-right">{{ item.leads }}</td>
                                    <td class="px-4 py-2 text-right">{{ item.conversion_rate | number: '1.2-2' }}%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </mat-card-content>
            </mat-card>

            <!-- Peec Brands -->
            <mat-card *ngIf="peecBrands.length > 0" class="mb-4">
                <mat-card-header>
                    <mat-card-title>Peec Brands ({{ peecBrands.length }})</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div *ngFor="let brand of peecBrands" class="rounded border p-4">
                            <h4 class="font-bold">{{ brand.name }}</h4>
                            <p class="text-sm text-gray-600">
                                Domains: {{ getDomainString(brand.domains) }}
                            </p>
                            <p class="text-xs text-gray-400">ID: {{ brand.id }}</p>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>

            <!-- SEO Keywords -->
            <mat-card *ngIf="seoKeywords.length > 0">
                <mat-card-header>
                    <mat-card-title>SEO Keyword Rankings ({{ seoKeywords.length }})</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-100">
                                <tr>
                                    <th class="px-4 py-2 text-left">Keyword</th>
                                    <th class="px-4 py-2 text-right">Position</th>
                                    <th class="px-4 py-2 text-right">Vol.</th>
                                    <th class="px-4 py-2 text-right">Δ</th>
                                    <th class="px-4 py-2 text-left">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr *ngFor="let kw of seoKeywords.slice(0, 10)" class="border-b">
                                    <td class="px-4 py-2">{{ kw.keyword }}</td>
                                    <td class="px-4 py-2 text-right font-bold">{{ kw.current_position }}</td>
                                    <td class="px-4 py-2 text-right">{{ kw.search_volume_current }}</td>
                                    <td class="px-4 py-2 text-right" [class.text-green-600]="kw.diff && kw.diff > 0"
                                        [class.text-red-600]="kw.diff && kw.diff < 0">
                                        {{ kw.diff }}
                                    </td>
                                    <td class="px-4 py-2">{{ kw.report_date }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </mat-card-content>
            </mat-card>

            <!-- Error Message -->
            <div *ngIf="error" class="rounded bg-red-100 p-4 text-red-700">{{ error }}</div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupabaseDemoComponent implements OnInit, OnDestroy {
    ga4Data: GA4MonthlyReport[] = [];
    peecBrands: PeecBrand[] = [];
    seoKeywords: SEOKeywordRanking[] = [];

    loading = false;
    error: string | null = null;

    private _unsubscribeAll = new Subject<void>();

    constructor(
        private db: SupabaseDatabaseService,
        private supabase: SupabaseService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        console.log('✅ Supabase Demo Component initialized');
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    loadGA4Data(): void {
        this.loading = true;
        this.error = null;
        this.cdr.markForCheck();

        this.db
            .getGA4MonthlyReport(100)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (data) => {
                    this.ga4Data = data;
                    console.log('✅ GA4 Data loaded:', data);
                    this.loading = false;
                    this.cdr.markForCheck();
                },
                error: (err) => {
                    this.error = `Fehler beim Laden: ${err.message}`;
                    console.error('❌ GA4 Error:', err);
                    this.loading = false;
                    this.cdr.markForCheck();
                },
            });
    }

    loadPeecBrands(): void {
        this.loading = true;
        this.error = null;
        this.cdr.markForCheck();

        this.db
            .getPeecBrands(100)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (data) => {
                    this.peecBrands = data;
                    console.log('✅ Peec Brands loaded:', data);
                    this.loading = false;
                    this.cdr.markForCheck();
                },
                error: (err) => {
                    this.error = `Fehler beim Laden: ${err.message}`;
                    console.error('❌ Peec Error:', err);
                    this.loading = false;
                    this.cdr.markForCheck();
                },
            });
    }

    loadSEOKeywords(): void {
        this.loading = true;
        this.error = null;
        this.cdr.markForCheck();

        this.db
            .getSEOKeywordRankings(100)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (data) => {
                    this.seoKeywords = data;
                    console.log('✅ SEO Keywords loaded:', data);
                    this.loading = false;
                    this.cdr.markForCheck();
                },
                error: (err) => {
                    this.error = `Fehler beim Laden: ${err.message}`;
                    console.error('❌ SEO Error:', err);
                    this.loading = false;
                    this.cdr.markForCheck();
                },
            });
    }

    clearData(): void {
        this.ga4Data = [];
        this.peecBrands = [];
        this.seoKeywords = [];
        this.error = null;
        this.cdr.markForCheck();
    }

    getDomainString(domains: string[] | string): string {
        if (Array.isArray(domains)) {
            return domains.join(', ');
        }
        return String(domains);
    }
}
