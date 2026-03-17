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
import { MatTooltipModule } from '@angular/material/tooltip';
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
    PeecModel,
} from '../../../core/supabase/supabase.types';

// ============== Local Interfaces ==============

interface BrandSummary {
    brand_name: string;
    isOwn: boolean;
    latestVisibility: number;
    previousVisibility: number | null;
    change: number;
    latestPosition: number | null;
    latestSentiment: number | null;
}

interface RankingRow {
    rank: number;
    brand_name: string;
    isOwn: boolean;
    visibility: number;
    visibilityChange: number | null;
    sov: number;
    sovChange: number | null;
    sentiment: number | null;
    sentimentChange: number | null;
    position: number | null;
    positionChange: number | null;
}

interface ExtractedUrl {
    url: string;
    domain: string;
    isOwn: boolean;
    sourceMessage: string;
    count?: number;
}

interface DomainUsageRow {
    domain: string;
    isOwn: boolean;
    totalCitations: number;
    byModel: { model: string; count: number }[];
}

// ============== Cross-Navigation Interfaces ==============

interface UrlDetail {
    url: string;
    domain: string;
    isOwn: boolean;
    count: number;
    conversationIds: string[];
    promptIds: string[];
}

interface ConversationDetail {
    conversation: LlmData;
    extractedUrls: ExtractedUrl[];
    matchedPrompts: PeecPrompt[];
    mentionedBrands: string[];
    mentionsOwn: boolean;
}

type ActiveDialog =
    | { type: 'prompt'; prompt: PeecPrompt }
    | { type: 'url'; urlDetail: UrlDetail }
    | { type: 'conversation'; detail: ConversationDetail };

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
        MatTooltipModule,
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
    private _models = signal<PeecModel[]>([]);

    activeModelLabels = computed(() => {
        const models = this._models();
        if (!models.length) return 'ChatGPT, Perplexity & Google AI';
        return models
            .filter(m => m.is_active)
            .map(m => this.getModelLabel(m.id))
            .join(', ');
    });

    // ============== Filter Signals ==============

    selectedBrand = signal<string>('all');
    selectedRange = signal<7 | 30 | 90>(30);

    // ============== Client-side Filter Signals ==============

    selectedLlmModel = signal<string>('all');
    conversationSearch = signal<string>('');
    onlyOwnMentions = signal<boolean>(false);
    promptSearchTerm = signal<string>('');

    // ============== UI State Signals ==============

    loading = signal<boolean>(false);
    error = signal<string | null>(null);
    dataLoaded = signal<boolean>(false);

    // ============== Own Brand Detection ==============

    ownBrand = computed<PeecBrand | null>(() => {
        const brands = this._brands();
        return brands.find(b => {
            const domainStr = Array.isArray(b.domains) ? b.domains.join(',') : String(b.domains ?? '');
            return domainStr.toLowerCase().includes('eom.de');
        }) ?? null;
    });

    ownBrandName = computed(() => this.ownBrand()?.name ?? null);

    ownDomains = computed<string[]>(() => {
        const brand = this.ownBrand();
        if (!brand) return [];
        if (Array.isArray(brand.domains)) return brand.domains.map(d => d.toLowerCase().trim());
        return String(brand.domains ?? '').split(',').map(d => d.toLowerCase().trim()).filter(Boolean);
    });

    isOwnDomain(domain: string): boolean {
        return this.ownDomains().some(d => domain.toLowerCase().includes(d) || d.includes(domain.toLowerCase()));
    }

    isOwnBrand(brandName: string): boolean {
        const own = this.ownBrandName();
        return own !== null && brandName.toLowerCase() === own.toLowerCase();
    }

    // ============== Data Indexes (for cross-navigation) ==============

    /** Bidirectional URL <-> Conversation index */
    private _urlConvIndex = computed(() => {
        const urlToConvs = new Map<string, Set<string>>();
        const convToUrls = new Map<string, ExtractedUrl[]>();

        for (const conv of this._conversations()) {
            if (!conv.assistant_message) continue;
            const urls = this._extractUrlsFromText(conv.assistant_message);
            convToUrls.set(conv.chat_id, urls);
            for (const u of urls) {
                const key = u.url.toLowerCase();
                if (!urlToConvs.has(key)) urlToConvs.set(key, new Set());
                urlToConvs.get(key)!.add(conv.chat_id);
            }
        }

        return { urlToConvs, convToUrls };
    });

    /** Bidirectional Prompt <-> Conversation index */
    private _promptConvIndex = computed(() => {
        const promptToConvs = new Map<string, Set<string>>();
        const convToPrompts = new Map<string, Set<string>>();

        const prompts = this._prompts();
        const convs = this._conversations();

        for (const prompt of prompts) {
            const promptText = prompt.text.toLowerCase().trim();
            const matchingConvs = new Set<string>();

            for (const conv of convs) {
                const userMsg = (conv.user_message ?? '').toLowerCase().trim();
                if (userMsg.includes(promptText) || promptText.includes(userMsg)) {
                    matchingConvs.add(conv.chat_id);
                    if (!convToPrompts.has(conv.chat_id)) convToPrompts.set(conv.chat_id, new Set());
                    convToPrompts.get(conv.chat_id)!.add(prompt.id);
                }
            }

            promptToConvs.set(prompt.id, matchingConvs);
        }

        return { promptToConvs, convToPrompts };
    });

    /** Get URLs extracted from a specific conversation */
    getConversationUrls(chatId: string): ExtractedUrl[] {
        return this._urlConvIndex().convToUrls.get(chatId) ?? [];
    }

    /** Get prompts that match a specific conversation */
    getConversationPrompts(chatId: string): PeecPrompt[] {
        const promptIds = this._promptConvIndex().convToPrompts.get(chatId);
        if (!promptIds || promptIds.size === 0) return [];
        return this._prompts().filter(p => promptIds.has(p.id));
    }

    /** Detect which brand names appear in a text */
    private _detectBrandsInText(text: string): string[] {
        const lower = text.toLowerCase();
        const found: string[] = [];
        for (const brand of this._brands()) {
            const terms = [brand.name.toLowerCase()];
            const domainStr = Array.isArray(brand.domains) ? brand.domains.join(',') : String(brand.domains ?? '');
            domainStr.split(',').forEach(d => {
                const trimmed = d.trim().toLowerCase();
                if (trimmed) terms.push(trimmed);
            });
            if (terms.some(t => lower.includes(t))) {
                found.push(brand.name);
            }
        }
        return found;
    }

    // ============== Dialog System ==============

    activeDialog = signal<ActiveDialog | null>(null);
    dialogHistory = signal<ActiveDialog[]>([]);
    expandedDialogConversations = signal<Set<string>>(new Set());

    openDialog(dialog: ActiveDialog): void {
        const current = this.activeDialog();
        if (current) {
            this.dialogHistory.update(h => [...h, current]);
        }
        this.activeDialog.set(dialog);
        this.expandedDialogConversations.set(new Set());
        this._lockScroll(true);
    }

    closeDialog(): void {
        this.activeDialog.set(null);
        this.dialogHistory.set([]);
        this.expandedDialogConversations.set(new Set());
        if (!this.showAllUrlsDialog() && !this.showAllConversationsDialog()) {
            this._lockScroll(false);
        }
    }

    openAllUrlsDialog(): void {
        this.showAllUrlsDialog.set(true);
        this._lockScroll(true);
    }

    closeAllUrlsDialog(): void {
        this.showAllUrlsDialog.set(false);
        if (!this.activeDialog() && !this.showAllConversationsDialog()) {
            this._lockScroll(false);
        }
    }

    openAllConversationsDialog(): void {
        this.showAllConversationsDialog.set(true);
        this._lockScroll(true);
    }

    closeAllConversationsDialog(): void {
        this.showAllConversationsDialog.set(false);
        if (!this.activeDialog() && !this.showAllUrlsDialog()) {
            this._lockScroll(false);
        }
    }

    private _lockScroll(lock: boolean): void {
        document.body.style.overflow = lock ? 'hidden' : '';
    }

    goBackDialog(): void {
        const history = this.dialogHistory();
        if (history.length === 0) {
            this.closeDialog();
            return;
        }
        const prev = history[history.length - 1];
        this.dialogHistory.set(history.slice(0, -1));
        this.activeDialog.set(prev);
        this.expandedDialogConversations.set(new Set());
    }

    openPromptDetail(prompt: PeecPrompt): void {
        this.openDialog({ type: 'prompt', prompt });
    }

    openUrlDetail(url: string): void {
        const urlDetail = this._buildUrlDetail(url);
        this.openDialog({ type: 'url', urlDetail });
    }

    openConversationDetail(chatId: string): void {
        const detail = this._buildConversationDetail(chatId);
        if (detail) {
            this.openDialog({ type: 'conversation', detail });
        }
    }

    filterByBrandFromDialog(brandName: string): void {
        this.closeDialog();
        this.selectedBrand.set(brandName);
        this.loadData();
    }

    getDialogBreadcrumb(dialog: ActiveDialog): string {
        switch (dialog.type) {
            case 'prompt': return `Prompt: ${dialog.prompt.text.substring(0, 30)}...`;
            case 'url': return `URL: ${dialog.urlDetail.domain}`;
            case 'conversation': return `Antwort: ${this.getModelLabel(dialog.detail.conversation.model_id)}`;
        }
    }

    toggleDialogConversation(chatId: string): void {
        const current = this.expandedDialogConversations();
        const next = new Set(current);
        if (next.has(chatId)) { next.delete(chatId); } else { next.add(chatId); }
        this.expandedDialogConversations.set(next);
    }

    isDialogExpanded(chatId: string): boolean {
        return this.expandedDialogConversations().has(chatId);
    }

    private _buildUrlDetail(url: string): UrlDetail {
        const key = url.toLowerCase();
        const convIds = Array.from(this._urlConvIndex().urlToConvs.get(key) ?? []);
        const promptIds = new Set<string>();
        const promptIndex = this._promptConvIndex();
        for (const cid of convIds) {
            const pIds = promptIndex.convToPrompts.get(cid);
            if (pIds) pIds.forEach(id => promptIds.add(id));
        }

        let domain = '';
        try { domain = new URL(url).hostname; } catch { domain = url; }

        // Count how many conversations contain this URL
        const allConvUrls = this._urlConvIndex().convToUrls;
        let count = 0;
        for (const [, urls] of allConvUrls) {
            if (urls.some(u => u.url.toLowerCase() === key)) count++;
        }

        return {
            url,
            domain,
            isOwn: this.isOwnDomain(domain),
            count,
            conversationIds: convIds,
            promptIds: Array.from(promptIds),
        };
    }

    private _buildConversationDetail(chatId: string): ConversationDetail | null {
        const conv = this._conversations().find(c => c.chat_id === chatId);
        if (!conv) return null;

        const extractedUrls = this.getConversationUrls(chatId);
        const matchedPrompts = this.getConversationPrompts(chatId);
        const mentionedBrands = this._detectBrandsInText(conv.assistant_message ?? '');
        const mentionsOwn = this.conversationMentionsOwn(conv);

        return { conversation: conv, extractedUrls, matchedPrompts, mentionedBrands, mentionsOwn };
    }

    // ============== Dialog Computed Signals ==============

    /** Conversations for prompt dialog */
    dialogPromptConversations = computed<LlmData[]>(() => {
        const dialog = this.activeDialog();
        if (!dialog || dialog.type !== 'prompt') return [];
        const chatIds = this._promptConvIndex().promptToConvs.get(dialog.prompt.id) ?? new Set();
        return this._conversations().filter(c => chatIds.has(c.chat_id));
    });

    dialogPromptConvsByModel = computed(() => {
        const convs = this.dialogPromptConversations();
        const map = new Map<string, LlmData[]>();
        for (const c of convs) {
            const model = c.model_id ?? 'unknown';
            if (!map.has(model)) map.set(model, []);
            map.get(model)!.push(c);
        }
        return Array.from(map.entries())
            .map(([model, items]) => ({ model, items }))
            .sort((a, b) => b.items.length - a.items.length);
    });

    /** URLs found across prompt conversations */
    dialogPromptUrls = computed<ExtractedUrl[]>(() => {
        const convs = this.dialogPromptConversations();
        const urlMap = new Map<string, ExtractedUrl & { count: number }>();
        const index = this._urlConvIndex();

        for (const conv of convs) {
            const urls = index.convToUrls.get(conv.chat_id) ?? [];
            for (const u of urls) {
                const existing = urlMap.get(u.url);
                if (existing) { existing.count++; } else { urlMap.set(u.url, { ...u, count: 1 }); }
            }
        }

        return Array.from(urlMap.values())
            .sort((a, b) => {
                if (a.isOwn && !b.isOwn) return -1;
                if (!a.isOwn && b.isOwn) return 1;
                return (b.count ?? 0) - (a.count ?? 0);
            })
            .slice(0, 20);
    });

    /** Conversations for URL dialog */
    dialogUrlConversations = computed<LlmData[]>(() => {
        const dialog = this.activeDialog();
        if (!dialog || dialog.type !== 'url') return [];
        const chatIds = this._urlConvIndex().urlToConvs.get(dialog.urlDetail.url.toLowerCase()) ?? new Set();
        return this._conversations().filter(c => chatIds.has(c.chat_id));
    });

    /** Prompts that led to URL conversations */
    dialogUrlPrompts = computed<PeecPrompt[]>(() => {
        const convs = this.dialogUrlConversations();
        const promptIndex = this._promptConvIndex();
        const promptIds = new Set<string>();
        for (const c of convs) {
            const pIds = promptIndex.convToPrompts.get(c.chat_id);
            if (pIds) pIds.forEach(id => promptIds.add(id));
        }
        return this._prompts().filter(p => promptIds.has(p.id));
    });

    /** Brands mentioned across URL conversations */
    dialogUrlBrands = computed<string[]>(() => {
        const convs = this.dialogUrlConversations();
        const brands = new Set<string>();
        for (const c of convs) {
            this._detectBrandsInText(c.assistant_message ?? '').forEach(b => brands.add(b));
        }
        return Array.from(brands).sort();
    });

    // ============== Computed Signals ==============

    availableBrands = computed<string[]>(() => {
        const peecBrands = this._brands().map(b => b.name);
        const visibilityBrands = this._brandVisibility().map(r => r.brand_name);
        const allNames = new Set([...peecBrands, ...visibilityBrands]);
        return ['all', ...Array.from(allNames).sort()];
    });

    private _computedVisibility = computed<BrandVisibilityHistory[]>(() => {
        const dbData = this._brandVisibility();
        if (dbData.length) return dbData;

        const brands = this._brands();
        const conversations = this._conversations();
        if (!brands.length || !conversations.length) return [];

        const brandSearchTerms = brands.map(b => {
            const terms = [b.name.toLowerCase()];
            if (b.domains) {
                const domainStr = Array.isArray(b.domains) ? b.domains.join(',') : String(b.domains);
                domainStr.split(',').forEach(d => {
                    const trimmed = d.trim().toLowerCase();
                    if (trimmed) terms.push(trimmed);
                });
            }
            return { brand: b, terms };
        });

        const convsByDate = new Map<string, LlmData[]>();
        for (const conv of conversations) {
            const date = conv.created_at.substring(0, 10);
            if (!convsByDate.has(date)) convsByDate.set(date, []);
            convsByDate.get(date)!.push(conv);
        }

        const result: BrandVisibilityHistory[] = [];
        for (const date of [...convsByDate.keys()].sort()) {
            const dayConvs = convsByDate.get(date)!;
            const totalConvs = dayConvs.length;

            for (const { brand, terms } of brandSearchTerms) {
                let mentionCount = 0;
                let totalMentions = 0;

                for (const conv of dayConvs) {
                    const text = (conv.assistant_message ?? '').toLowerCase();
                    if (terms.some(t => text.includes(t))) {
                        mentionCount++;
                        for (const t of terms) {
                            const regex = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                            totalMentions += (text.match(regex) || []).length;
                        }
                    }
                }

                result.push({
                    id: `computed_${brand.id}_${date}`,
                    brand_id: brand.id,
                    brand_name: brand.name,
                    report_date: date,
                    visibility: mentionCount,
                    visibility_percent: totalConvs > 0 ? Math.round((mentionCount / totalConvs) * 10000) / 100 : 0,
                    visibility_count: mentionCount,
                    visibility_total: totalConvs,
                    sentiment: null,
                    sentiment_avg: null,
                    position_avg: mentionCount > 0 ? Math.round((totalMentions / mentionCount) * 10) / 10 : null,
                    created_at: date + 'T00:00:00Z',
                });
            }
        }

        return result;
    });

    brandSummaries = computed<BrandSummary[]>(() => {
        const data = this._computedVisibility();
        if (!data.length) {
            return this._brands().map(b => ({
                brand_name: b.name, isOwn: this.isOwnBrand(b.name),
                latestVisibility: 0, previousVisibility: null, change: 0,
                latestPosition: null, latestSentiment: null,
            }));
        }

        const allDates = [...new Set(data.map(e => e.report_date))].sort();
        const latestDate = allDates[allDates.length - 1];
        // Find date closest to 7 days before latest
        const latestMs = new Date(latestDate).getTime();
        const targetMs = latestMs - 7 * 24 * 60 * 60 * 1000;
        const previousDate = allDates.length >= 2
            ? allDates.filter(d => d < latestDate).reduce<string | null>((best, d) => {
                if (!best) return d;
                return Math.abs(new Date(d).getTime() - targetMs) < Math.abs(new Date(best).getTime() - targetMs) ? d : best;
            }, null)
            : null;

        const brandMap = new Map<string, Map<string, BrandVisibilityHistory>>();
        for (const entry of data) {
            if (!brandMap.has(entry.brand_name)) brandMap.set(entry.brand_name, new Map());
            brandMap.get(entry.brand_name)!.set(entry.report_date, entry);
        }

        const summaries: BrandSummary[] = [];
        for (const [brandName, dateMap] of brandMap) {
            const latest = dateMap.get(latestDate);
            const previous = previousDate ? dateMap.get(previousDate) : null;
            const latestVis = latest?.visibility_percent ?? 0;
            const prevVis = previous?.visibility_percent ?? null;
            const change = prevVis !== null && prevVis > 0
                ? Math.round(((latestVis - prevVis) / prevVis) * 1000) / 100 : 0;

            summaries.push({
                brand_name: brandName, isOwn: this.isOwnBrand(brandName),
                latestVisibility: latestVis, previousVisibility: prevVis, change,
                latestPosition: latest?.position_avg ?? null, latestSentiment: latest?.sentiment_avg ?? latest?.sentiment ?? null,
            });
        }

        return summaries.sort((a, b) => {
            if (a.isOwn && !b.isOwn) return -1;
            if (!a.isOwn && b.isOwn) return 1;
            return b.latestVisibility - a.latestVisibility;
        });
    });

    ownBrandSummary = computed<BrandSummary | null>(() => this.brandSummaries().find(s => s.isOwn) ?? null);
    competitorSummaries = computed<BrandSummary[]>(() => this.brandSummaries().filter(s => !s.isOwn));

    // ============== Rankings Table ==============

    rankingSortColumn = signal<'visibility' | 'sov' | 'sentiment' | 'position'>('visibility');
    rankingSortDir = signal<'asc' | 'desc'>('desc');
    showAllRankings = signal(false);

    rankingRows = computed<RankingRow[]>(() => {
        const data = this._computedVisibility();
        if (!data.length) return [];

        const allDates = [...new Set(data.map(e => e.report_date))].sort();
        const latestDate = allDates[allDates.length - 1];
        const latestMs = new Date(latestDate).getTime();
        const targetMs = latestMs - 7 * 24 * 60 * 60 * 1000;
        const previousDate = allDates.length >= 2
            ? allDates.filter(d => d < latestDate).reduce<string | null>((best, d) => {
                if (!best) return d;
                return Math.abs(new Date(d).getTime() - targetMs) < Math.abs(new Date(best).getTime() - targetMs) ? d : best;
            }, null)
            : null;

        const brandMap = new Map<string, Map<string, BrandVisibilityHistory>>();
        for (const entry of data) {
            if (!brandMap.has(entry.brand_name)) brandMap.set(entry.brand_name, new Map());
            brandMap.get(entry.brand_name)!.set(entry.report_date, entry);
        }

        // SOV = brand visibility_count / sum of all brands' visibility_count on latest date
        const latestEntries = data.filter(e => e.report_date === latestDate);
        const totalVisCount = latestEntries.reduce((s, e) => s + (e.visibility_count ?? 0), 0);
        const previousEntries = previousDate ? data.filter(e => e.report_date === previousDate) : [];
        const prevTotalVisCount = previousEntries.reduce((s, e) => s + (e.visibility_count ?? 0), 0);

        const rows: RankingRow[] = [];
        for (const [brandName, dateMap] of brandMap) {
            const latest = dateMap.get(latestDate);
            const previous = previousDate ? dateMap.get(previousDate) : null;

            const vis = latest?.visibility_percent ?? 0;
            const prevVis = previous?.visibility_percent ?? null;
            const visChange = prevVis !== null ? Math.round((vis - prevVis) * 100) / 100 : null;

            const sov = totalVisCount > 0 ? Math.round(((latest?.visibility_count ?? 0) / totalVisCount) * 10000) / 100 : 0;
            const prevSov = prevTotalVisCount > 0 && previous ? Math.round(((previous.visibility_count ?? 0) / prevTotalVisCount) * 10000) / 100 : null;
            const sovChange = prevSov !== null ? Math.round((sov - prevSov) * 100) / 100 : null;

            const sentiment = latest?.sentiment_avg ?? latest?.sentiment ?? null;
            const prevSentiment = previous?.sentiment_avg ?? previous?.sentiment ?? null;
            const sentimentChange = sentiment !== null && prevSentiment !== null ? Math.round(sentiment - prevSentiment) : null;

            const position = latest?.position_avg ?? null;
            const prevPosition = previous?.position_avg ?? null;
            const positionChange = position !== null && prevPosition !== null ? Math.round((position - prevPosition) * 10) / 10 : null;

            rows.push({
                rank: 0, brand_name: brandName, isOwn: this.isOwnBrand(brandName),
                visibility: vis, visibilityChange: visChange,
                sov, sovChange,
                sentiment, sentimentChange,
                position, positionChange,
            });
        }

        // Sort
        const col = this.rankingSortColumn();
        const dir = this.rankingSortDir();
        rows.sort((a, b) => {
            const valA = a[col] ?? 0;
            const valB = b[col] ?? 0;
            return dir === 'desc' ? (valB as number) - (valA as number) : (valA as number) - (valB as number);
        });

        rows.forEach((r, i) => r.rank = i + 1);
        return rows;
    });

    toggleRankingSort(col: 'visibility' | 'sov' | 'sentiment' | 'position'): void {
        if (this.rankingSortColumn() === col) {
            this.rankingSortDir.set(this.rankingSortDir() === 'desc' ? 'asc' : 'desc');
        } else {
            this.rankingSortColumn.set(col);
            this.rankingSortDir.set('desc');
        }
    }

    getSentimentColor(val: number | null): string {
        if (val === null) return 'text-gray-400';
        if (val >= 70) return 'text-green-500';
        if (val >= 40) return 'text-yellow-500';
        return 'text-red-500';
    }

    getSentimentDot(val: number | null): string {
        if (val === null) return 'bg-gray-300';
        if (val >= 70) return 'bg-green-500';
        if (val >= 40) return 'bg-yellow-500';
        return 'bg-red-500';
    }

    visibilityChartSeries = computed<{ name: string; data: number[] }[]>(() => {
        const data = this._computedVisibility();
        const brandFilter = this.selectedBrand();
        const allDates = [...new Set(data.map(e => e.report_date))].sort();

        const brandMap = new Map<string, Map<string, BrandVisibilityHistory>>();
        for (const entry of data) {
            if (!brandMap.has(entry.brand_name)) brandMap.set(entry.brand_name, new Map());
            brandMap.get(entry.brand_name)!.set(entry.report_date, entry);
        }

        const series: { name: string; data: number[] }[] = [];
        for (const brand of this.brandSummaries()) {
            const dateMap = brandMap.get(brand.brand_name);
            if (!dateMap) continue;
            if (brandFilter !== 'all' && brand.brand_name !== brandFilter) continue;
            series.push({
                name: brand.brand_name,
                data: allDates.map(date => {
                    const entry = dateMap.get(date);
                    return entry ? Math.round(entry.visibility_percent * 100) / 100 : 0;
                }),
            });
        }
        return series;
    });

    visibilityChartCategories = computed<string[]>(() => {
        const data = this._computedVisibility();
        return [...new Set(data.map(e => e.report_date))].sort().map(d => {
            const date = new Date(d + 'T00:00:00');
            return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        });
    });

    chartVisibilityConfig = computed<ApexOptions>(() => {
        const ownName = this.ownBrandName();
        const seriesData = this.visibilityChartSeries();
        const colors = seriesData.map((s, i) => {
            if (ownName && s.name === ownName) return '#10B981';
            const palette = ['#818CF8', '#FB7185', '#38BDF8', '#FBBF24', '#A78BFA', '#F472B6', '#34D399'];
            return palette[i % palette.length];
        });

        return {
            chart: { type: 'area', height: 350, fontFamily: 'inherit', foreColor: '#94A3B8', background: 'transparent', toolbar: { show: false }, zoom: { enabled: false } },
            colors,
            dataLabels: { enabled: false },
            fill: { type: 'solid', opacity: 0.08 },
            grid: { show: true, borderColor: 'rgba(51,65,85,0.1)', xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } }, padding: { top: 0, bottom: 0 } },
            series: seriesData,
            stroke: { width: 2.5, curve: 'smooth' },
            markers: { size: 3, hover: { size: 6 } },
            legend: { show: true, position: 'top', horizontalAlign: 'left', labels: { colors: '#94A3B8' }, markers: { size: 8, shape: 'circle' as any } },
            tooltip: {
                theme: undefined, shared: true, intersect: false,
                custom: ({ series: s, seriesIndex, dataPointIndex, w }): string => {
                    const items = w.config.series.map((ser: any, i: number) => ({ name: ser.name, value: s[i][dataPointIndex], color: w.config.colors[i], isOwn: ownName ? ser.name === ownName : false })).filter((item: any) => item.value != null).sort((a: any, b: any) => b.value - a.value);
                    const cats = w.config.xaxis?.categories ?? [];
                    const date = cats[dataPointIndex] ?? '';
                    let html = `<div style="padding:10px 14px;font-size:13px;background:rgba(255,255,255,0.97);border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.12);border:1px solid rgba(0,0,0,0.08);">`;
                    html += `<div style="font-weight:600;margin-bottom:8px;color:#64748B;font-size:12px;">${date}</div>`;
                    for (const item of items) {
                        const nameStyle = item.isOwn ? 'font-weight:700;color:#059669;' : 'color:#475569;';
                        html += `<div style="display:flex;align-items:center;gap:8px;padding:3px 0;"><span style="width:8px;height:8px;border-radius:50%;background:${item.color};display:inline-block;"></span><span style="flex:1;${nameStyle}">${item.name}${item.isOwn ? ' ★' : ''}</span><span style="font-weight:600;color:#1E293B;margin-left:16px;">${item.value.toFixed(1)}%</span></div>`;
                    }
                    html += `</div>`;
                    return html;
                },
            },
            xaxis: { categories: this.visibilityChartCategories(), labels: { style: { colors: '#64748B', fontSize: '11px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
            yaxis: { show: true, labels: { style: { colors: '#64748B' }, formatter: (val: number): string => (val != null ? val.toFixed(0) + '%' : '') } },
        };
    });

    filteredAiUrls = computed<AIVisibilityUrl[]>(() => {
        const urls = this._aiUrls();
        const brand = this.selectedBrand();
        if (brand === 'all') return urls.slice(0, 10);
        return urls.filter(u => u.brand_name === brand).slice(0, 10);
    });

    extractedUrlsFromConversations = computed<ExtractedUrl[]>(() => {
        let convs = this._conversations();

        // Brand filter propagation
        const brand = this.selectedBrand();
        if (brand !== 'all') {
            convs = convs.filter(c => {
                const text = (c.assistant_message ?? '').toLowerCase();
                const b = this._brands().find(br => br.name === brand);
                if (!b) return false;
                const terms = [b.name.toLowerCase()];
                const domainStr = Array.isArray(b.domains) ? b.domains.join(',') : String(b.domains ?? '');
                domainStr.split(',').forEach(d => { const t = d.trim().toLowerCase(); if (t) terms.push(t); });
                return terms.some(t => text.includes(t));
            });
        }

        const urlMap = new Map<string, ExtractedUrl & { count: number }>();
        for (const conv of convs) {
            if (!conv.assistant_message) continue;
            const extracted = this._extractUrlsFromText(conv.assistant_message);
            for (const e of extracted) {
                const existing = urlMap.get(e.url);
                if (existing) { existing.count++; } else { urlMap.set(e.url, { ...e, count: 1 }); }
            }
        }

        return Array.from(urlMap.values())
            .sort((a, b) => {
                if (a.isOwn && !b.isOwn) return -1;
                if (!a.isOwn && b.isOwn) return 1;
                return (b.count ?? 0) - (a.count ?? 0);
            })
            .slice(0, 30);
    });

    ownUrls = computed(() => this.extractedUrlsFromConversations().filter(u => u.isOwn));
    externalUrls = computed(() => this.extractedUrlsFromConversations().filter(u => !u.isOwn));

    // Limited to 10 combined (own first, then external)
    limitedOwnUrls = computed(() => this.ownUrls().slice(0, 10));
    limitedExternalUrls = computed(() => {
        const remaining = 10 - this.ownUrls().length;
        return remaining > 0 ? this.externalUrls().slice(0, remaining) : [];
    });
    totalUrlCount = computed(() => this.ownUrls().length + this.externalUrls().length);
    showAllUrlsDialog = signal(false);

    llmDomainRows = computed<DomainUsageRow[]>(() => {
        const usage = this._llmUsage();
        const modelFilter = this.selectedLlmModel();
        const domainMap = new Map<string, { byModel: Map<string, number>; total: number }>();

        for (const item of usage) {
            if (modelFilter !== 'all' && item.llm_model !== modelFilter) continue;
            if (!domainMap.has(item.domain)) domainMap.set(item.domain, { byModel: new Map(), total: 0 });
            const domain = domainMap.get(item.domain)!;
            const count = item.citation_count ?? 0;
            domain.byModel.set(item.llm_model ?? 'Unknown', (domain.byModel.get(item.llm_model ?? 'Unknown') ?? 0) + count);
            domain.total += count;
        }

        const rows: DomainUsageRow[] = [];
        for (const [domain, data] of domainMap) {
            rows.push({ domain, isOwn: this.isOwnDomain(domain), totalCitations: data.total, byModel: Array.from(data.byModel.entries()).map(([model, count]) => ({ model, count })) });
        }

        return rows.sort((a, b) => {
            if (a.isOwn && !b.isOwn) return -1;
            if (!a.isOwn && b.isOwn) return 1;
            return b.totalCitations - a.totalCitations;
        });
    });

    availableLlmModels = computed<string[]>(() => {
        const models = new Set(this._llmUsage().map(u => u.llm_model).filter(Boolean));
        return ['all', ...Array.from(models).sort()];
    });

    filteredConversations = computed<LlmData[]>(() => {
        const search = this.conversationSearch().toLowerCase();
        const onlyOwn = this.onlyOwnMentions();
        const brand = this.selectedBrand();
        let convs = this._conversations();

        // Brand filter propagation
        if (brand !== 'all') {
            convs = convs.filter(c => {
                const text = (c.assistant_message ?? '').toLowerCase();
                const b = this._brands().find(br => br.name === brand);
                if (!b) return false;
                const terms = [b.name.toLowerCase()];
                const domainStr = Array.isArray(b.domains) ? b.domains.join(',') : String(b.domains ?? '');
                domainStr.split(',').forEach(d => { const t = d.trim().toLowerCase(); if (t) terms.push(t); });
                return terms.some(t => text.includes(t));
            });
        }

        if (onlyOwn) convs = convs.filter(c => this.conversationMentionsOwn(c));
        if (search) {
            convs = convs.filter(c =>
                c.user_message?.toLowerCase().includes(search) ||
                c.assistant_message?.toLowerCase().includes(search)
            );
        }
        return convs;
    });

    ownMentionCount = computed(() => this._conversations().filter(c => this.conversationMentionsOwn(c)).length);

    filteredPrompts = computed<PeecPrompt[]>(() => {
        const term = this.promptSearchTerm().toLowerCase();
        const prompts = this._prompts();
        if (!term) return prompts;
        return prompts.filter(p => p.text?.toLowerCase().includes(term) || p.tags?.some(t => t?.toLowerCase().includes(term)));
    });

    totalBrands = computed(() => this._brands().length);
    totalConversations = computed(() => this._conversations().length);
    totalPrompts = computed(() => this._prompts().length);
    avgSourcesPerConv = computed(() => {
        const convs = this._conversations();
        if (!convs.length) return 0;
        return Math.round((convs.reduce((sum, c) => sum + (c.sources_count ?? 0), 0) / convs.length) * 10) / 10;
    });

    conversationsByModel = computed(() => {
        const map = new Map<string, number>();
        for (const c of this._conversations()) { const m = c.model_id ?? 'unknown'; map.set(m, (map.get(m) ?? 0) + 1); }
        return Array.from(map.entries()).map(([model, count]) => ({ model, count })).sort((a, b) => b.count - a.count);
    });

    brandCards = computed(() => {
        const summaries = this.brandSummaries();
        return this._brands().map(b => {
            const summary = summaries.find(s => s.brand_name === b.name);
            return { ...b, isOwn: this.isOwnBrand(b.name), domain: Array.isArray(b.domains) ? b.domains.join(', ') : String(b.domains ?? ''), visibility: summary?.latestVisibility ?? 0, change: summary?.change ?? 0, mentions: summary?.latestPosition ?? null };
        }).sort((a, b) => { if (a.isOwn && !b.isOwn) return -1; if (!a.isOwn && b.isOwn) return 1; return b.visibility - a.visibility; });
    });

    // ============== UI Expand State ==============

    expandedConversations = signal<Set<string>>(new Set());
    showAllConversations = signal<boolean>(false);
    showAllConversationsDialog = signal(false);
    showAllPrompts = signal<boolean>(false);

    visibleConversations = computed(() => {
        return this.filteredConversations().slice(0, 10);
    });

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
            chart: { events: {
                mounted: (chart: any): void => this._fixSvgFill(chart.el),
                updated: (chart: any): void => this._fixSvgFill(chart.el),
            } },
        };
        this.loadData();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        this._lockScroll(false);
    }

    // ============== Public Methods ==============

    loadData(): void {
        this.loading.set(true);
        this.error.set(null);

        const days = this.selectedRange();
        const start = this._getDateString(-days);
        const end = this._getDateString(0);
        const brand = this.selectedBrand();

        forkJoin({
            brands: this._db.fetchBrands(),
            models: this._db.fetchModels(),
            brandVisibility: this._db.fetchBrandVisibility({ startDate: start, endDate: end, brandName: brand === 'all' ? undefined : brand }),
            aiUrls: this._db.fetchAiUrls({ brandName: brand === 'all' ? undefined : brand, limit: 50 }),
            llmUsage: this._db.fetchLlmUsage({ startDate: start, endDate: end }),
            conversations: this._db.fetchConversations({ startDate: start, endDate: end, limit: 200 }),
            prompts: this._db.fetchPrompts({ limit: 500 }),
        })
            .pipe(takeUntil(this._unsubscribeAll), finalize(() => this.loading.set(false)))
            .subscribe({
                next: (results) => {
                    this._brands.set(results.brands);
                    this._models.set(results.models);
                    this._brandVisibility.set(results.brandVisibility);
                    this._aiUrls.set(results.aiUrls);
                    this._llmUsage.set(results.llmUsage);
                    this._conversations.set(results.conversations);
                    this._prompts.set(results.prompts);
                    this.dataLoaded.set(true);
                    console.log(`✅ GEO AI geladen — ${results.brands.length} Brands, ${results.brandVisibility.length} Visibility, ${results.conversations.length} Conversations, ${results.prompts.length} Prompts`);
                },
                error: (err) => {
                    console.error('❌ GEO AI data load failed:', err);
                    this._brands.set([]); this._brandVisibility.set([]); this._aiUrls.set([]);
                    this._llmUsage.set([]); this._conversations.set([]); this._prompts.set([]);
                    this.dataLoaded.set(true);
                    this.error.set('Verbindung zu Datenbank fehlgeschlagen.');
                },
            });
    }

    exportPdf(): void {
        window.print();
    }

    onBrandChange(brand: string): void {
        this.selectedBrand.set(brand);
        this.loadData();
    }

    setQuickRange(days: 7 | 30 | 90): void {
        this.selectedRange.set(days);
        this.loadData();
    }

    getClassificationClass(classification: string | null): string {
        switch (classification) {
            case 'owned': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
            case 'competitor': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
            case 'press': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
            default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
        }
    }

    getModelCount(row: DomainUsageRow, model: string): number | undefined {
        return row.byModel.find(m => m.model === model)?.count;
    }

    toggleConversation(chatId: string): void {
        const next = new Set(this.expandedConversations());
        if (next.has(chatId)) { next.delete(chatId); } else { next.add(chatId); }
        this.expandedConversations.set(next);
    }

    isExpanded(chatId: string): boolean {
        return this.expandedConversations().has(chatId);
    }

    getModelLabel(modelId: string | null): string {
        if (!modelId) return 'Unknown';
        const labels: Record<string, string> = {
            'chatgpt-scraper': 'ChatGPT', 'perplexity-scraper': 'Perplexity',
            'google-ai-overview-scraper': 'Google AI', 'google-ai-mode-scraper': 'Google AI Mode', 'gemini-scraper': 'Gemini',
        };
        return labels[modelId] ?? modelId;
    }

    getModelColor(modelId: string | null): string {
        const colors: Record<string, string> = {
            'chatgpt-scraper': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
            'perplexity-scraper': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            'google-ai-overview-scraper': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
            'google-ai-mode-scraper': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
            'gemini-scraper': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
        };
        return colors[modelId ?? ''] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }

    conversationMentionsOwn(conv: LlmData): boolean {
        const own = this.ownBrandName();
        if (!own) return false;
        const text = (conv.assistant_message ?? '').toLowerCase();
        const domains = this.ownDomains();
        return text.includes(own.toLowerCase()) || domains.some(d => text.includes(d));
    }

    /** Open URL detail for the most-cited URL of a domain */
    openDomainDetail(domain: string): void {
        const index = this._urlConvIndex();
        let bestUrl = '';
        let bestCount = 0;
        for (const [url, convIds] of index.urlToConvs) {
            if (url.includes(domain.toLowerCase()) && convIds.size > bestCount) {
                bestUrl = url;
                bestCount = convIds.size;
            }
        }
        if (bestUrl) {
            // Find original-case URL
            for (const conv of this._conversations()) {
                if (!conv.assistant_message) continue;
                const urls = this._extractUrlsFromText(conv.assistant_message);
                const found = urls.find(u => u.url.toLowerCase() === bestUrl);
                if (found) { this.openUrlDetail(found.url); return; }
            }
            this.openUrlDetail(bestUrl);
        }
    }

    // ============== Private Methods ==============

    private _getDateString(offsetDays: number): string {
        const date = new Date();
        date.setDate(date.getDate() + offsetDays);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    private _extractUrlsFromText(text: string): ExtractedUrl[] {
        const urlRegex = /https?:\/\/([\w.-]+)(\/[^\s\)"'<>]*)?/gi;
        const matches: ExtractedUrl[] = [];
        let match: RegExpExecArray | null;

        while ((match = urlRegex.exec(text)) !== null) {
            const url = match[0].replace(/[.,;)]+$/, '');
            const domain = match[1];
            if (!matches.some(m => m.url === url)) {
                matches.push({
                    url, domain,
                    isOwn: this.isOwnDomain(domain),
                    sourceMessage: text.substring(Math.max(0, match.index - 20), Math.min(text.length, match.index + 60)),
                });
            }
        }
        return matches;
    }

    private _fixSvgFill(element: Element): void {
        const currentURL = this._router.url;
        Array.from(element.querySelectorAll('*[fill]'))
            .filter(el => (el.getAttribute('fill') ?? '').indexOf('url(') !== -1)
            .forEach(el => {
                const attrVal = el.getAttribute('fill') ?? '';
                el.setAttribute('fill', `url(${currentURL}${attrVal.slice(attrVal.indexOf('#'))})`);
            });
    }
}
