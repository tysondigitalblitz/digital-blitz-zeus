// types/meta-conversions.ts

export interface Client {
    id: string;
    name: string;
    company_name?: string;
    meta_pixel_id: string;
    meta_access_token: string;
    created_at: string;
    updated_at: string;
    is_active: boolean;
}

export interface UserData {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string; // YYYY-MM-DD
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    externalId?: string;
    clientIpAddress?: string;
    clientUserAgent?: string;
    fbp?: string; // Facebook pixel cookie
    fbc?: string; // Facebook click ID
}

export interface CustomData {
    value?: number;
    currency?: string; // ISO 4217 code (USD, EUR, etc.)
    content_name?: string;
    content_category?: string;
    content_ids?: string[];
    contents?: Array<{
        id: string;
        quantity: number;
        item_price?: number;
    }>;
    content_type?: string;
    order_id?: string;
    predicted_ltv?: number;
    num_items?: number;
    status?: string;
    search_string?: string;
}

export interface ConversionUpload {
    id?: string;
    client_id: string;
    batch_id: string;
    event_name: string;
    event_time: string; // ISO 8601
    event_id: string;
    user_data: UserData;
    custom_data?: CustomData;
    event_source_url?: string;
    action_source?: 'website' | 'app' | 'offline' | 'other';
    upload_status?: 'pending' | 'uploaded' | 'failed';
    uploaded_at?: string;
    created_at?: string;
}

export interface MetaApiResponse {
    events_received: number;
    events_dropped: number;
    error_count: number;
    response_data: unknown;
    warnings?: string[];
    errors?: string[];
}

export interface UploadBatch {
    id: string; // batch_id
    client_id: string;
    file_name?: string;
    total_events: number;
    upload_type: 'manual' | 'api' | 'csv';
    uploaded_by?: string;
    date_range_start: string;
    date_range_end: string;
    created_at: string;
    completed_at?: string;
}

export interface ConversionResult {
    id: string;
    upload_id: string;
    client_id: string;
    batch_id: string;
    event_id: string;
    match_quality_score?: number;
    processed_at?: string;
    attribution_data?: unknown;
    status: 'matched' | 'dropped' | 'error';
    error_message?: string;
    created_at: string;
}

// For CSV uploads
export interface CSVRow {
    event_name: string;
    event_time: string;
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    value?: string;
    currency?: string;
    content_ids?: string;
    content_name?: string;
    order_id?: string;
}

// Dashboard Analytics Types
export interface ConversionAnalytics {
    totalUploaded: number;
    totalProcessed: number;
    successRate: number;
    totalValue: number;
    byEventType: Array<{
        event_name: string;
        count: number;
        value: number;
    }>;
    byDate: Array<{
        date: string;
        uploaded: number;
        processed: number;
        value: number;
    }>;
    byClient: Array<{
        client_name: string;
        uploaded: number;
        processed: number;
        success_rate: number;
    }>;
}

export type CsvRow = {
    event_name: string;
    event_time: string;
    event_id?: string;
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    value?: string | number;
    currency?: string;
    content_ids?: string;
    content_name?: string;
    order_id?: string;
    event_source_url?: string;
    action_source?: string;
};

export type userData = {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    externalId?: string;
    clientIpAddress?: string;
    clientUserAgent?: string;
    fbp?: string;
    fbc?: string;
};