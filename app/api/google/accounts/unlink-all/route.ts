// app/api/google/accounts/unlink-all/route.ts
import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';

export async function POST() {
    try {
        // Unlink ALL Google Ads accounts by setting business_id to null
        const { data: unlinkedAccounts, error: unlinkError } = await supabase
            .from('google_ads_accounts')
            .update({
                business_id: null,
                updated_at: new Date().toISOString()
            })
            .not('business_id', 'is', null) // Only update accounts that are currently linked
            .select('id, account_name, customer_id');

        if (unlinkError) {
            console.error('Error unlinking accounts:', unlinkError);
            return NextResponse.json(
                { error: 'Failed to unlink accounts' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Successfully unlinked ${unlinkedAccounts?.length || 0} accounts`,
            unlinkedAccounts: unlinkedAccounts?.map(acc => ({
                id: acc.id,
                account_name: acc.account_name,
                customer_id: acc.customer_id
            }))
        });

    } catch (error) {
        console.error('Unlink all accounts error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}