// app/api/dashboard/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const { searchParams } = new URL(req.url);
        const timeRange = searchParams.get('timeRange') || '7d';

        // Calculate date filter based on time range
        const now = new Date();
        const startDate = new Date();

        switch (timeRange) {
            case '24h':
                startDate.setDate(now.getDate() - 1);
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
            default:
                startDate.setDate(now.getDate() - 7);
        }

        // Get total conversions for Google
        const { data: googleConversions, error: googleError } = await supabase
            .from('google_conversions')
            .select('purchase_amount, synced_to_google, matched_gclid')
            .gte('created_at', startDate.toISOString());

        if (googleError) {
            console.error('Error fetching Google conversions:', googleError);
        }

        // Get total conversions for Meta
        const { data: metaConversions, error: metaError } = await supabase
            .from('meta_conversions')
            .select('purchase_amount, synced_to_meta')
            .gte('created_at', startDate.toISOString());

        if (metaError) {
            console.error('Error fetching Meta conversions:', metaError);
        }

        // Calculate stats
        const googleStats = {
            count: googleConversions?.length || 0,
            revenue: googleConversions?.reduce((sum, conv) => sum + (Number(conv.purchase_amount) || 0), 0) || 0,
            synced: googleConversions?.filter(conv => conv.synced_to_google).length || 0
        };

        const metaStats = {
            count: metaConversions?.length || 0,
            revenue: metaConversions?.reduce((sum, conv) => sum + (Number(conv.purchase_amount) || 0), 0) || 0,
            synced: metaConversions?.filter(conv => conv.synced_to_meta).length || 0
        };

        // Calculate match rate (conversions with matched_gclid / total conversions)
        const googleMatched = googleConversions?.filter(conv => conv.matched_gclid).length || 0;

        // Wait until META is Built
        // const metaMatched = metaConversions?.filter(conv => conv.matched_fbclid).length || 0;
        const metaMatched = metaConversions?.length || 0; // Assuming all Meta conversions are matched for simplicity

        const totalMatched = googleMatched + metaMatched;
        const totalConversions = googleStats.count + metaStats.count;
        const matchRate = totalConversions > 0 ? (totalMatched / totalConversions) * 100 : 0;

        // Get active businesses count
        const { data: businesses, error: businessError } = await supabase
            .from('businesses')
            .select('id, name')
            .eq('is_active', true);

        if (businessError) {
            console.error('Error fetching businesses:', businessError);
        }

        // Get last upload timestamp
        const { data: lastUpload } = await supabase
            .from('google_conversions')
            .select('created_at')
            .order('created_at', { ascending: false })
            .limit(1);

        const stats = {
            totalConversions: totalConversions,
            googleConversions: googleStats.count,
            metaConversions: metaStats.count,
            totalRevenue: googleStats.revenue + metaStats.revenue,
            googleRevenue: googleStats.revenue,
            metaRevenue: metaStats.revenue,
            matchRate: Math.round(matchRate * 10) / 10, // Round to 1 decimal
            lastUpload: lastUpload?.[0]?.created_at || null,
            activeBusinesses: businesses?.length || 0,
            syncedToGoogle: googleStats.synced,
            syncedToMeta: metaStats.synced
        };

        return NextResponse.json(stats);

    } catch (error) {
        console.error('Dashboard stats error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard stats' },
            { status: 500 }
        );
    }
}