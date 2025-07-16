// app/api/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';
import type {
    ClickEvent,
    DailyData,
    PlatformData,
    CampaignPerformance,
    RecentEvent,
    AnalyticsResponse,
    GroupedData,
    DateRange,
    CampaignData
} from '../../../lib/types/analytics';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const range = (searchParams.get('range') || '7d') as DateRange;
        const clientId = searchParams.get('client_id');

        // Calculate date range
        const now = new Date();
        const startDate = new Date();

        switch (range) {
            case '24h':
                startDate.setHours(now.getHours() - 24);
                break;
            case '7d':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(now.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(now.getDate() - 90);
                break;
        }

        // Build query
        let query = supabase
            .from('click_events')
            .select('*')
            .gte('timestamp', startDate.toISOString());

        if (clientId) {
            query = query.eq('client_id', clientId);
        }

        const { data: events, error } = await query;

        if (error) throw error;
        if (!events) throw new Error('No events found');

        // Type assertion for events
        const typedEvents = events as ClickEvent[];

        // Calculate metrics
        const totalClicks = typedEvents.length;
        const uniqueVisitors = new Set(typedEvents.map(e => e.ip_address)).size;
        const conversions = typedEvents.filter(e => e.email || e.phone).length;
        const conversionRate = totalClicks > 0 ? (conversions / totalClicks * 100).toFixed(1) : '0';

        // Group by day for daily data
        const dailyData = groupByDay(typedEvents);

        // Platform distribution
        const platformCounts = typedEvents.reduce<Record<string, number>>((acc, event) => {
            const platform = event.platform || 'unknown';
            acc[platform] = (acc[platform] || 0) + 1;
            return acc;
        }, {});

        const totalPlatformCount = Object.values(platformCounts).reduce((a, b) => a + b, 0);
        const platformData: PlatformData[] = Object.entries(platformCounts).map(([name, count]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value: Math.round((count / totalPlatformCount) * 100),
            color: getPlatformColor(name)
        }));

        // Campaign performance
        const campaignData = getCampaignPerformance(typedEvents);

        // Recent events (last 20)
        const recentEvents: RecentEvent[] = typedEvents
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 20)
            .map(event => ({
                id: event.id,
                email: maskEmail(event.email),
                phone: maskPhone(event.phone),
                campaign: event.utm_campaign || 'Direct',
                time: getRelativeTime(event.timestamp),
                platform: event.platform || 'unknown'
            }));

        const response: AnalyticsResponse = {
            totalClicks,
            uniqueVisitors,
            conversions,
            conversionRate,
            dailyData,
            platformData,
            campaignData,
            recentEvents
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Analytics error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}

// Helper functions
function groupByDay(events: ClickEvent[]): DailyData[] {
    const grouped = events.reduce<GroupedData>((acc, event) => {
        const date = new Date(event.timestamp).toLocaleDateString('en-US', { weekday: 'short' });
        if (!acc[date]) {
            acc[date] = { clicks: 0, conversions: 0 };
        }
        acc[date].clicks++;
        if (event.email || event.phone) {
            acc[date].conversions++;
        }
        return acc;
    }, {});

    return Object.entries(grouped).map(([date, data]) => ({
        date,
        clicks: data.clicks,
        conversions: data.conversions
    }));
}

function getCampaignPerformance(events: ClickEvent[]): CampaignPerformance[] {
    const campaigns = events.reduce<Record<string, CampaignData>>((acc, event) => {
        const campaign = event.utm_campaign || 'Direct';
        if (!acc[campaign]) {
            acc[campaign] = { clicks: 0, conversions: 0 };
        }
        acc[campaign].clicks++;
        if (event.email || event.phone) {
            acc[campaign].conversions++;
        }
        return acc;
    }, {});

    return Object.entries(campaigns).map(([campaign, data]) => ({
        campaign,
        clicks: data.clicks,
        conversions: data.conversions,
        ctr: ((data.conversions / data.clicks) * 100).toFixed(1)
    })).sort((a, b) => b.clicks - a.clicks);
}

function getPlatformColor(platform: string): string {
    const colors: Record<string, string> = {
        wix: '#0088FE',
        wordpress: '#00C49F',
        shopify: '#FFBB28',
        unknown: '#FF8042'
    };
    return colors[platform] || '#8884D8';
}

function maskEmail(email: string | null): string | null {
    if (!email) return null;
    const [user, domain] = email.split('@');
    if (!user || !domain) return email; // Return original if malformed
    return user.substring(0, 3) + '***@' + domain;
}

function maskPhone(phone: string | null): string | null {
    if (!phone || phone.length < 11) return phone;
    return phone.substring(0, 7) + '***' + phone.substring(phone.length - 4);
}

function getRelativeTime(timestamp: string): string {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}