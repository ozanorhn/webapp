/**
 * Supabase Data Types for GA4, Peec AI, and SEO
 */

// ============== GA4 Analytics Types ==============

export interface GA4MonthlyReport {
    id: string;
    report_date: string;
    dimension_type: string;
    dimension_value: string;
    sessions: number;
    leads: number;
    conversion_rate: number;
    created_at: string;
}

export interface GA4SourceMonthly {
    id: string;
    report_date: string;
    source: string;
    sessions: number;
    leads: number;
    conversion_rate: number;
    created_at: string;
}

// ============== Peec AI Types ==============

export interface PeecBrand {
    id: string;
    name: string;
    domains: string[] | string;
    project_id: string;
    created_at: string;
    updated_at: string;
}

export interface PeecTopic {
    id: string;
    name: string;
    project_id: string;
    created_at: string;
}

export interface PeecModel {
    id: string;
    is_active: boolean;
    project_id: string | null;
    created_at: string;
}

export interface PeecPrompt {
    id: string;
    text: string;
    tags: string[] | null;
    topic_id: string | null;
    country: string | null;
    volume: number | null;
    project_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface PeecTag {
    id: string;
    [key: string]: any;
}

// ============== SEO/Sistrix Types ==============

export interface SEOKeywordRanking {
    id: string;
    keyword: string;
    report_date: string;
    current_position: number;
    last_position: number | null;
    search_volume_current: number;
    search_volume_last: number | null;
    diff: number | null;
    percent_change: number | null;
    status: string;
    created_at: string;
}

export interface AIVisibilityUrl {
    id: string;
    url: string;
    domain: string | null;
    classification: string | null;
    brand_name: string | null;
    mention_count: number | null;
    llm_model: string | null;
    report_date: string | null;
    created_at: string;
}

// ============== GEO AI Types ==============

export interface BrandVisibilityHistory {
    id: string;
    brand_id: string | null;
    brand_name: string;
    report_date: string;
    visibility: number | null;
    visibility_percent: number;
    visibility_count: number | null;
    visibility_total: number | null;
    sentiment: number | null;
    sentiment_avg: number | null;
    position_avg: number | null;
    created_at: string;
}

export interface LlmData {
    chat_id: string;           // PK - not 'id'
    model_id: string | null;
    user_message: string | null;
    assistant_message: string | null;
    sources_count: number | null;
    brands_count: number | null;
    created_at: string;
}

export interface LlmDomainUsage {
    id: string;
    domain: string;
    llm_model: string | null;
    citation_count: number | null;
    report_date: string | null;
    brand_name: string | null;
    created_at: string;
}

// ============== Authentication Types ==============

export interface AuthUser {
    id: string;
    email: string;
    user_metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface AuthSession {
    access_token: string;
    refresh_token: string | null;
    expires_in: number;
    token_type: string;
}
