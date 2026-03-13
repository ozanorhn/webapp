import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Observable, from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import {
    GA4MonthlyReport,
    GA4SourceMonthly,
    PeecBrand,
    PeecTopic,
    PeecModel,
    PeecPrompt,
    PeecTag,
    SEOKeywordRanking,
    AIVisibilityUrl,
    BrandVisibilityHistory,
    LlmData,
    LlmDomainUsage,
} from './supabase.types';

@Injectable({
    providedIn: 'root',
})
export class SupabaseDatabaseService {
    private supabase: SupabaseClient;

    // Real table names from your Supabase instance
    private readonly tables = {
        // GA4 Tables
        GA4_MONTHLY_REPORT: 'ga4_monthly_report',
        GA4_SOURCE_MONTHLY: 'ga4_source_monthly',
        GA4_MONTHLY_SUMMARY: 'ga4_monthly_summary',

        // Peec AI Tables
        PEEC_BRANDS: 'peec_brands',
        PEEC_TOPICS: 'peec_topics',
        PEEC_MODELS: 'peec_models',
        PEEC_PROMPTS: 'peec_prompts',
        PEEC_TAGS: 'peec_tags',

        // SEO Tables
        SEO_KEYWORD_RANKINGS: 'seo_keyword_rankings',
        AI_VISIBILITY_URLS: 'ai_visibility_urls',
        BRAND_VISIBILITY_HISTORY: 'brand_visibility_history',
        SEO_VISIBILITY_HISTORY: 'seo_visibility_history',

        // Chat & LLM
        CHATS: 'chats',
        CHAT_MESSAGES: 'chat_messages',
        LLM_DATA: 'llm_data',
        LLM_DOMAIN_USAGE: 'llm_domain_usage',
    };

    constructor(private supabaseService: SupabaseService) {
        this.supabase = this.supabaseService.getClient();
    }

    // ============== GA4 Methods ==============

    /**
     * Get GA4 monthly report data
     */
    getGA4MonthlyReport(limit: number = 100): Observable<GA4MonthlyReport[]> {
        return from(
            this.supabase
                .from(this.tables.GA4_MONTHLY_REPORT)
                .select('*')
                .limit(limit)
                .order('report_date', { ascending: false })
                .then((res) => {
                    if (res.error) throw res.error;
                    return (res.data || []) as GA4MonthlyReport[];
                })
        );
    }

    /**
     * Get GA4 source monthly data
     */
    getGA4SourceMonthly(limit: number = 100): Observable<GA4SourceMonthly[]> {
        return from(
            this.supabase
                .from(this.tables.GA4_SOURCE_MONTHLY)
                .select('*')
                .limit(limit)
                .order('report_date', { ascending: false })
                .then((res) => {
                    if (res.error) throw res.error;
                    return (res.data || []) as GA4SourceMonthly[];
                })
        );
    }

    /**
     * Insert GA4 report
     */
    insertGA4MonthlyReport(
        data: Omit<GA4MonthlyReport, 'id' | 'created_at'>
    ): Observable<GA4MonthlyReport> {
        return from(
            this.supabase
                .from(this.tables.GA4_MONTHLY_REPORT)
                .insert([data])
                .select()
                .then((res) => {
                    if (res.error) throw res.error;
                    return res.data[0] as GA4MonthlyReport;
                })
        );
    }

    // ============== Peec AI Methods ==============

    /**
     * Get all Peec brands
     */
    getPeecBrands(limit: number = 100): Observable<PeecBrand[]> {
        return from(
            this.supabase
                .from(this.tables.PEEC_BRANDS)
                .select('*')
                .limit(limit)
                .then((res) => {
                    if (res.error) throw res.error;
                    return (res.data || []) as PeecBrand[];
                })
        );
    }

    /**
     * Get Peec brand by ID
     */
    getPeecBrandById(id: string): Observable<PeecBrand | null> {
        return from(
            this.supabase
                .from(this.tables.PEEC_BRANDS)
                .select('*')
                .eq('id', id)
                .single()
                .then((res) => {
                    if (res.error) return null;
                    return res.data as PeecBrand;
                })
        );
    }

    /**
     * Get all Peec topics
     */
    getPeecTopics(limit: number = 100): Observable<PeecTopic[]> {
        return from(
            this.supabase
                .from(this.tables.PEEC_TOPICS)
                .select('*')
                .limit(limit)
                .then((res) => {
                    if (res.error) throw res.error;
                    return (res.data || []) as PeecTopic[];
                })
        );
    }

    /**
     * Insert Peec brand
     */
    insertPeecBrand(data: Omit<PeecBrand, 'id' | 'created_at' | 'updated_at'>): Observable<PeecBrand> {
        return from(
            this.supabase
                .from(this.tables.PEEC_BRANDS)
                .insert([data])
                .select()
                .then((res) => {
                    if (res.error) throw res.error;
                    return res.data[0] as PeecBrand;
                })
        );
    }

    /**
     * Update Peec brand
     */
    updatePeecBrand(id: string, data: Partial<PeecBrand>): Observable<PeecBrand> {
        return from(
            this.supabase
                .from(this.tables.PEEC_BRANDS)
                .update(data)
                .eq('id', id)
                .select()
                .then((res) => {
                    if (res.error) throw res.error;
                    return res.data[0] as PeecBrand;
                })
        );
    }

    // ============== SEO Methods ==============

    /**
     * Get SEO keyword rankings
     */
    getSEOKeywordRankings(
        limit: number = 100,
        filters?: { startDate?: string; endDate?: string }
    ): Observable<SEOKeywordRanking[]> {
        return from(this._queryTable<SEOKeywordRanking>(this.tables.SEO_KEYWORD_RANKINGS, limit, filters));
    }

    /**
     * Get keyword rankings by keyword
     */
    getKeywordRankingsByKeyword(keyword: string): Observable<SEOKeywordRanking[]> {
        return from(
            this.supabase
                .from(this.tables.SEO_KEYWORD_RANKINGS)
                .select('*')
                .eq('keyword', keyword)
                .order('report_date', { ascending: false })
                .then((res) => {
                    if (res.error) throw res.error;
                    return (res.data || []) as SEOKeywordRanking[];
                })
        );
    }

    /**
     * Insert SEO keyword ranking
     */
    insertSEOKeywordRanking(
        data: Omit<SEOKeywordRanking, 'id' | 'created_at'>
    ): Observable<SEOKeywordRanking> {
        return from(
            this.supabase
                .from(this.tables.SEO_KEYWORD_RANKINGS)
                .insert([data])
                .select()
                .then((res) => {
                    if (res.error) throw res.error;
                    return res.data[0] as SEOKeywordRanking;
                })
        );
    }

    /**
     * Get AI visibility URLs
     */
    getAIVisibilityUrls(limit: number = 100): Observable<AIVisibilityUrl[]> {
        return from(
            this.supabase
                .from(this.tables.AI_VISIBILITY_URLS)
                .select('*')
                .limit(limit)
                .then((res) => {
                    if (res.error) throw res.error;
                    return (res.data || []) as AIVisibilityUrl[];
                })
        );
    }

    // ============== GEO AI Methods ==============

    /**
     * Fetch all brands from peec_brands
     */
    fetchBrands(): Observable<PeecBrand[]> {
        return from(
            this.supabase
                .from(this.tables.PEEC_BRANDS)
                .select('*')
                .order('name', { ascending: true })
                .then((res) => {
                    if (res.error) throw res.error;
                    return (res.data || []) as PeecBrand[];
                })
        );
    }

    /**
     * Fetch brand visibility history with optional filters
     */
    fetchBrandVisibility(filters?: {
        startDate?: string;
        endDate?: string;
        brandName?: string;
    }): Observable<BrandVisibilityHistory[]> {
        return from(
            (async () => {
                let query = this.supabase.from(this.tables.BRAND_VISIBILITY_HISTORY).select('*');

                if (filters?.startDate) {
                    query = query.gte('report_date', filters.startDate);
                }
                if (filters?.endDate) {
                    query = query.lte('report_date', filters.endDate);
                }
                if (filters?.brandName) {
                    query = query.eq('brand_name', filters.brandName);
                }

                const { data, error } = await query.order('report_date', { ascending: false });
                if (error) throw error;
                return (data || []) as BrandVisibilityHistory[];
            })()
        );
    }

    /**
     * Fetch AI visibility URLs with optional filters
     */
    fetchAiUrls(filters?: {
        brandName?: string;
        limit?: number;
    }): Observable<AIVisibilityUrl[]> {
        return from(
            (async () => {
                let query = this.supabase.from(this.tables.AI_VISIBILITY_URLS).select('*');

                if (filters?.brandName) {
                    query = query.eq('brand_name', filters.brandName);
                }

                const { data, error } = await query.limit(filters?.limit ?? 50);
                if (error) throw error;
                return (data || []) as AIVisibilityUrl[];
            })()
        );
    }

    /**
     * Fetch LLM domain usage with optional filters
     */
    fetchLlmUsage(filters?: {
        llmModel?: string;
        startDate?: string;
        endDate?: string;
    }): Observable<LlmDomainUsage[]> {
        return from(
            (async () => {
                let query = this.supabase.from(this.tables.LLM_DOMAIN_USAGE).select('*');

                if (filters?.llmModel) {
                    query = query.eq('llm_model', filters.llmModel);
                }
                if (filters?.startDate) {
                    query = query.gte('report_date', filters.startDate);
                }
                if (filters?.endDate) {
                    query = query.lte('report_date', filters.endDate);
                }

                const { data, error } = await query.order('report_date', { ascending: false });
                if (error) throw error;
                return (data || []) as LlmDomainUsage[];
            })()
        );
    }

    /**
     * Fetch conversations (LLM data) with optional filters
     * NOTE: PK is 'chat_id', not 'id'
     */
    fetchConversations(filters?: {
        limit?: number;
    }): Observable<LlmData[]> {
        return from(
            this.supabase
                .from(this.tables.LLM_DATA)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(filters?.limit ?? 100)
                .then((res) => {
                    if (res.error) throw res.error;
                    return (res.data || []) as LlmData[];
                })
        );
    }

    /**
     * Fetch prompts with optional filters
     */
    fetchPrompts(filters?: {
        country?: string;
        minVolume?: number;
        limit?: number;
    }): Observable<PeecPrompt[]> {
        return from(
            (async () => {
                let query = this.supabase.from(this.tables.PEEC_PROMPTS).select('*');

                if (filters?.country) {
                    query = query.eq('country', filters.country);
                }
                if (filters?.minVolume !== undefined) {
                    query = query.gte('volume', filters.minVolume);
                }

                const { data, error } = await query
                    .order('volume', { ascending: false, nullsFirst: false })
                    .limit(filters?.limit ?? 500);
                if (error) throw error;
                return (data || []) as PeecPrompt[];
            })()
        );
    }

    // ============== Generic Methods ==============

    /**
     * Execute generic query on any table
     */
    query<T>(tableName: string, limit: number = 100, filters?: Record<string, any>): Observable<T[]> {
        return from(this._queryTable<T>(tableName, limit, filters));
    }

    /**
     * Insert record into any table
     */
    insert<T>(tableName: string, data: Omit<T, 'id' | 'created_at'>): Observable<T> {
        return from(
            this.supabase
                .from(tableName)
                .insert([data])
                .select()
                .then((res) => {
                    if (res.error) throw res.error;
                    return res.data[0] as T;
                })
        );
    }

    /**
     * Update record in any table
     */
    update<T>(tableName: string, id: string, data: Partial<T>): Observable<T> {
        return from(
            this.supabase
                .from(tableName)
                .update(data)
                .eq('id', id)
                .select()
                .then((res) => {
                    if (res.error) throw res.error;
                    return res.data[0] as T;
                })
        );
    }

    /**
     * Delete record from any table
     */
    delete(tableName: string, id: string): Observable<void> {
        return from(
            this.supabase
                .from(tableName)
                .delete()
                .eq('id', id)
                .then((res) => {
                    if (res.error) throw res.error;
                })
        );
    }

    // ============== Private Helper Methods ==============

    /**
     * Generic table query with optional date filters
     */
    private async _queryTable<T>(
        tableName: string,
        limit: number,
        filters?: { startDate?: string; endDate?: string }
    ): Promise<T[]> {
        let query = this.supabase.from(tableName).select('*').limit(limit);

        // Add date range filters if provided
        if (filters?.startDate) {
            query = query.gte('report_date', filters.startDate);
        }
        if (filters?.endDate) {
            query = query.lte('report_date', filters.endDate);
        }

        const { data, error } = await query.order('report_date', { ascending: false });

        if (error) throw error;
        return (data || []) as T[];
    }
}
