// app/api/google/check-conversion-types/route.ts
import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';

export async function GET() {
    try {
        // Get all conversion actions from your database with proper joins
        const { data: actions, error } = await supabase
            .from('google_ads_conversion_actions')
            .select(`
                *,
                account:google_ads_accounts!inner(
                    customer_id, 
                    account_name,
                    business:businesses(id, name)
                )
            `)
            .order('conversion_action_name');

        if (error) throw error;

        // Group by type to see what you have
        const typeBreakdown = actions?.reduce((acc, action) => {
            const type = action.conversion_type || 'UNKNOWN';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Find your specific Apek Roofing actions (now properly linked)
        const apekActions = actions?.filter(a =>
            a.account?.customer_id === '6484917056'
        );

        // Find the Offline Purchase API specifically
        const offlinePurchaseAPI = actions?.find(a =>
            a.conversion_action_name?.includes('Offline Purchase - API') &&
            a.account?.customer_id === '6484917056'
        );

        return NextResponse.json({
            totalActions: actions?.length || 0,
            typeBreakdown,
            apekRoofingActions: apekActions?.map(a => ({
                id: a.conversion_action_id,
                name: a.conversion_action_name,
                type: a.conversion_type,
                status: a.status,
                resourceName: a.resource_name,
                customerId: a.account?.customer_id,
                accountName: a.account?.account_name,
                businessName: a.account?.business?.name
            })),
            offlinePurchaseAPI: offlinePurchaseAPI ? {
                id: offlinePurchaseAPI.conversion_action_id,
                name: offlinePurchaseAPI.conversion_action_name,
                type: offlinePurchaseAPI.conversion_type,
                status: offlinePurchaseAPI.status,
                resourceName: offlinePurchaseAPI.resource_name,
                customerId: offlinePurchaseAPI.account?.customer_id,
                accountName: offlinePurchaseAPI.account?.account_name,
                businessName: offlinePurchaseAPI.account?.business?.name
            } : null,
            allActions: actions?.map(a => ({
                customer_id: a.account?.customer_id,
                account_name: a.account?.account_name,
                business_name: a.account?.business?.name,
                conversion_action_id: a.conversion_action_id,
                conversion_action_name: a.conversion_action_name,
                conversion_type: a.conversion_type,
                resource_name: a.resource_name
            }))
        });

    } catch (error) {
        console.error('Error checking conversion types:', error);
        return NextResponse.json({
            error: 'Failed to check types',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}