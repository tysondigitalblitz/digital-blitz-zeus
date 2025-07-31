// lib/types/google-ads.ts

// Business entity
export interface Business {
    id: string;
    name: string;
    description?: string;
    pixel_id?: string;
    is_active: boolean;
    google_ads_refresh_token?: string;
    google_ads_connected_at?: string;
    created_at: string;
    updated_at: string;
    google_ads_accounts?: GoogleAdsAccount[];
}

// Google Ads Account
export interface GoogleAdsAccount {
    id: string;
    business_id: string;
    customer_id: string;
    account_name: string;
    account_type?: 'manager' | 'standard';
    parent_account_id?: string | null;
    is_active: boolean;
    refresh_token?: string;
    last_synced_at?: string;
    created_at: string;
    updated_at: string;
    conversion_actions?: GoogleAdsConversionAction[];
}

// Google Ads Conversion Action
export interface GoogleAdsConversionAction {
    id: string;
    account_id: string;
    conversion_action_id: string;
    conversion_action_name: string;
    conversion_type?: string;
    status: 'ENABLED' | 'PAUSED' | 'REMOVED';
    value_settings?: ConversionValueSettings;
    is_enhanced_conversions_enabled?: boolean;
    created_at?: string;
    updated_at?: string;
}

// Conversion Value Settings
export interface ConversionValueSettings {
    defaultValue?: number;
    defaultCurrencyCode?: string;
    alwaysUseDefaultValue?: boolean;
}

// Google Ads Sync Log
export interface GoogleAdsSyncLog {
    id: string;
    account_id: string;
    batch_id: string;
    sync_type: 'conversion_upload' | 'account_sync';
    request_data?: Record<string, unknown>;
    response_data?: unknown;
    status: 'pending' | 'success' | 'partial' | 'failed';
    error_message?: string | null;
    conversions_sent?: number;
    conversions_accepted?: number;
    started_at: string;
    completed_at?: string | null;
    account?: {
        customer_id: string;
        account_name: string;
    };
}

// Google Conversion Record
export interface GoogleConversion {
    id: string;
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    purchase_amount: number;
    purchase_date: string;
    order_id: string;
    matched_click_event_id?: string;
    matched_gclid?: string;
    match_type?: 'exact' | 'probable' | 'statistical' | 'none';
    match_confidence?: number;
    attribution_method?: string;
    match_details?: Record<string, unknown>;
    conversion_action_id?: string;
    processed_at?: string;
    google_sync_response?: unknown;
    google_sync_at?: string;
    upload_batch_id?: string;
    uploaded_by?: string;
    conversion_name?: string;
    processed: boolean;
    synced_to_google: boolean;
    created_at: string;
    updated_at: string;
    file_name?: string;
    business_id?: string;
    google_ads_account_id?: string;
}

// API Request/Response Types
export interface SyncToGoogleRequest {
    batchId?: string;
    businessId?: string;
    accountId?: string;
    conversionActionId?: string;
}

export interface SyncToGoogleResponse {
    success: boolean;
    uploaded?: number;
    results?: unknown;
    syncLogId?: string;
    error?: string;
}

export interface GoogleAdsUploadRequest {
    batchId?: string;
    customerId: string;
    conversionActionId: string;
    conversions: OfflineConversion[];
}

export interface OfflineConversion {
    gclid: string;
    conversionDateTime: string;
    conversionValue: number;
    currencyCode?: string;
    orderId?: string;
}

// Database query result types with Supabase
export type GoogleAdsAccountWithRelations = GoogleAdsAccount & {
    conversion_actions?: GoogleAdsConversionAction[];
    business?: Business;
};

export type BusinessWithRelations = Business & {
    google_ads_accounts?: GoogleAdsAccountWithRelations[];
};