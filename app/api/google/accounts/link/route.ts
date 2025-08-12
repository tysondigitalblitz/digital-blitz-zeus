// app/api/google/accounts/link/route.ts
import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';

// app/api/google/accounts/link/route.ts - Fixed POST method
export async function POST(req: NextRequest) {
    try {
        const { businessId, googleAdsAccountId } = await req.json();

        if (!businessId || !googleAdsAccountId) {
            return NextResponse.json(
                { error: 'Missing required parameters: businessId, googleAdsAccountId' },
                { status: 400 }
            );
        }

        // Verify the business exists
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('id, name')
            .eq('id', businessId)
            .single();

        if (businessError || !business) {
            return NextResponse.json(
                { error: 'Business not found' },
                { status: 404 }
            );
        }

        // Verify the Google Ads account exists
        const { data: googleAdsAccount, error: accountError } = await supabase
            .from('google_ads_accounts')
            .select(`
                *,
                business:businesses(name)
            `)
            .eq('id', googleAdsAccountId)
            .single();

        if (accountError || !googleAdsAccount) {
            return NextResponse.json(
                { error: 'Google Ads account not found' },
                { status: 404 }
            );
        }

        // Check if account is already linked to another business
        // BUT ignore the dummy business "__UNLINKED_ACCOUNTS__"
        if (googleAdsAccount.business_id &&
            googleAdsAccount.business_id !== businessId &&
            googleAdsAccount.business?.name !== '__UNLINKED_ACCOUNTS__') {

            const { data: currentBusiness } = await supabase
                .from('businesses')
                .select('name')
                .eq('id', googleAdsAccount.business_id)
                .single();

            return NextResponse.json(
                { error: `Account is already linked to business: ${currentBusiness?.name || 'Unknown'}` },
                { status: 409 }
            );
        }

        // Link the account to the business
        const { data: updatedAccount, error: updateError } = await supabase
            .from('google_ads_accounts')
            .update({
                business_id: businessId,
                updated_at: new Date().toISOString()
            })
            .eq('id', googleAdsAccountId)
            .select(`
                *,
                business:businesses(name),
                conversion_actions:google_ads_conversion_actions(*)
            `)
            .single();

        if (updateError) {
            console.error('Error linking account:', updateError);
            return NextResponse.json(
                { error: 'Failed to link account' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Successfully linked ${updatedAccount.account_name} to ${business.name}`,
            account: updatedAccount
        });

    } catch (error) {
        console.error('Link account error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Get available accounts to link
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const businessId = searchParams.get('businessId');

        // Get unlinked accounts (no business_id) or accounts already linked to this business
        let query = supabase
            .from('google_ads_accounts')
            .select(`
                *,
                business:businesses(name),
                conversion_actions:google_ads_conversion_actions(*)
            `)
            .order('account_name');

        if (businessId) {
            // Show accounts that are either unlinked OR already linked to this business
            query = query.or(`business_id.is.null,business_id.eq.${businessId}`);
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { data: accounts, error } = await supabase
                .from('google_ads_accounts')
                .select(`*`)
                .order('account_name');
        }

        const { data: accounts, error } = await query;

        if (error) {
            console.error('Error fetching linkable accounts:', error);
            return NextResponse.json(
                { error: 'Failed to fetch accounts' },
                { status: 500 }
            );
        }

        // Categorize accounts
        const unlinkedAccounts = accounts?.filter(acc => !acc.business_id) || [];
        const linkedToThisBusiness = businessId ? accounts?.filter(acc => acc.business_id === businessId) || [] : [];
        const accountsWithConversions = accounts?.filter(acc => acc.conversion_actions && acc.conversion_actions.length > 0) || [];

        return NextResponse.json({
            success: true,
            unlinkedAccounts,
            linkedToThisBusiness,
            accountsWithConversions: accountsWithConversions.length,
            totalAccounts: accounts?.length || 0,
            accounts: accounts?.map(acc => ({
                id: acc.id,
                customer_id: acc.customer_id,
                account_name: acc.account_name,
                account_type: acc.account_type,
                is_active: acc.is_active,
                business_name: acc.business?.name || null,
                conversion_actions_count: acc.conversion_actions?.length || 0,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                has_enhanced_conversions: acc.conversion_actions?.some((ca: any) => ca.conversion_type === '8') || false
            }))
        });

    } catch (error) {
        console.error('Get linkable accounts error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}