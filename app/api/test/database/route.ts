// app/api/test/database/route.ts
import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';

export async function GET() {
    try {
        // Test basic database connection
        const { data: testConnection, error: connectionError } = await supabase
            .from('businesses')
            .select('count')
            .limit(1);

        if (connectionError) {
            throw new Error(`Database connection failed: ${connectionError.message}`);
        }

        // Check all required tables
        const requiredTables = [
            'businesses',
            'google_ads_accounts',
            'google_ads_conversion_actions',
            'google_ads_sync_log',
            'google_conversions',
            'click_events'
        ];

        const tableChecks = {};

        for (const table of requiredTables) {
            try {
                const { error } = await supabase
                    .from(table)
                    .select('id')
                    .limit(1);

                tableChecks[table] = !error;
            } catch (e) {
                tableChecks[table] = false;
            }
        }

        // Get counts for key tables
        const { count: businessCount } = await supabase
            .from('businesses')
            .select('*', { count: 'exact', head: true });

        const { count: accountCount } = await supabase
            .from('google_ads_accounts')
            .select('*', { count: 'exact', head: true });

        const { count: conversionCount } = await supabase
            .from('google_conversions')
            .select('*', { count: 'exact', head: true });

        return NextResponse.json({
            success: true,
            connected: true,
            tables: tableChecks,
            counts: {
                businesses: businessCount || 0,
                googleAdsAccounts: accountCount || 0,
                conversions: conversionCount || 0
            }
        });

    } catch (error) {
        console.error('Database test error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                connected: false
            },
            { status: 500 }
        );
    }
}