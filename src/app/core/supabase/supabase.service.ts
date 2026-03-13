import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'environments/environment';
import { AuthSession, AuthUser } from './supabase.types';

@Injectable({
    providedIn: 'root',
})
export class SupabaseService {
    private supabase: SupabaseClient;
    private authUser$ = new BehaviorSubject<AuthUser | null>(null);
    private loading$ = new BehaviorSubject<boolean>(false);

    constructor() {
        // Initialize Supabase Client
        // Construct full URL if relative path is provided
        let supabaseUrl = environment.supabase.url;
        if (!supabaseUrl.startsWith('http')) {
            // Relative URL - construct full URL for development proxy
            supabaseUrl = `${window.location.origin}${supabaseUrl}`;
        }

        this.supabase = createClient(
            supabaseUrl,
            environment.supabase.anonKey
        );

        // Initialize auth state
        this.initializeAuth();
    }

    /**
     * Initialize authentication state
     */
    private initializeAuth(): void {
        this.supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                this.authUser$.next({
                    id: session.user.id,
                    email: session.user.email || '',
                    user_metadata: session.user.user_metadata,
                    created_at: session.user.created_at,
                    updated_at: session.user.updated_at,
                });
            } else {
                this.authUser$.next(null);
            }
        });
    }

    /**
     * Get Supabase client instance
     */
    getClient(): SupabaseClient {
        return this.supabase;
    }

    /**
     * Sign up with email and password
     */
    async signUp(email: string, password: string): Promise<AuthSession | null> {
        this.loading$.next(true);
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
            });

            if (error) throw error;

            return data.session as AuthSession | null;
        } finally {
            this.loading$.next(false);
        }
    }

    /**
     * Sign in with email and password
     */
    async signIn(email: string, password: string): Promise<AuthSession | null> {
        this.loading$.next(true);
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            return data.session as AuthSession | null;
        } finally {
            this.loading$.next(false);
        }
    }

    /**
     * Sign out
     */
    async signOut(): Promise<void> {
        this.loading$.next(true);
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            this.authUser$.next(null);
        } finally {
            this.loading$.next(false);
        }
    }

    /**
     * Get current auth user observable
     */
    getAuthUser$(): Observable<AuthUser | null> {
        return this.authUser$.asObservable();
    }

    /**
     * Get loading state observable
     */
    getLoading$(): Observable<boolean> {
        return this.loading$.asObservable();
    }

    /**
     * Get current session
     */
    async getSession(): Promise<AuthSession | null> {
        const { data } = await this.supabase.auth.getSession();
        return data.session as AuthSession | null;
    }

    /**
     * Check if user is authenticated
     */
    async isAuthenticated(): Promise<boolean> {
        const session = await this.getSession();
        return !!session;
    }
}
