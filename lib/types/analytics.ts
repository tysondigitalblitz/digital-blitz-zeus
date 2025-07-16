// types/analytics.ts

export interface ClickEvent {
    id: string;
    client_id: string;
    gclid: string | null;
    wbraid: string | null;
    gbraid: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    utm_term: string | null;
    utm_content: string | null;
    page_url: string;
    page_title: string | null;
    referrer: string | null;
    platform: string | null;
    ip_address: string;
    user_agent: string;
    email: string | null;
    phone: string | null;
    timestamp: string;
    tracked_at: string | null;
    synced_to_google?: boolean;
}

export interface DailyData {
    date: string;
    clicks: number;
    conversions: number;
}

export interface PlatformData {
    name: string;
    value: number;
    color: string;
}

export interface CampaignPerformance {
    campaign: string;
    clicks: number;
    conversions: number;
    ctr: string;
}

export interface RecentEvent {
    id: string;
    email: string | null;
    phone: string | null;
    campaign: string;
    time: string;
    platform: string;
}

export interface AnalyticsResponse {
    totalClicks: number;
    uniqueVisitors: number;
    conversions: number;
    conversionRate: string | number;
    dailyData: DailyData[];
    platformData: PlatformData[];
    campaignData: CampaignPerformance[];
    recentEvents: RecentEvent[];
}

export interface GroupedData {
    [key: string]: {
        clicks: number;
        conversions: number;
    };
}

export type DateRange = '24h' | '7d' | '30d' | '90d';

export interface CampaignData {
    clicks: number;
    conversions: number;
}