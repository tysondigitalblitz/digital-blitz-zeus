// app/api/google/accounts/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';
import { googleAdsClient } from '@/lib/google-ads/config';

export async function POST(req: NextRequest) {
    try {
        const { refreshToken, businessId } = await req.json();

        if (!refreshToken || !businessId) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        // Verify business exists
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', businessId)
            .single();

        if (businessError || !business) {
            return NextResponse.json(
                { error: 'Business not found' },
                { status: 404 }
            );
        }

        // Get accessible accounts from Google Ads
        const accounts = await googleAdsClient.getAccessibleAccounts(refreshToken);

        // Sync accounts to database
        const syncedAccounts = [];
        const errors = [];

        for (const account of accounts) {
            try {
                // Check if account already exists
                const { data: existingAccount } = await supabase
                    .from('google_ads_accounts')
                    .select('id')
                    .eq('customer_id', account.customerId)
                    .single();

                if (existingAccount) {
                    // Update existing account
                    const { data: updated, error: updateError } = await supabase
                        .from('google_ads_accounts')
                        .update({
                            account_name: account.descriptiveName,
                            is_active: account.status === 'ENABLED',
                            refresh_token: refreshToken,
                            last_synced_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', existingAccount.id)
                        .select()
                        .single();

                    if (updateError) throw updateError;
                    syncedAccounts.push(updated);
                } else {
                    // Insert new account
                    const { data: inserted, error: insertError } = await supabase
                        .from('google_ads_accounts')
                        .insert({
                            business_id: businessId,
                            customer_id: account.customerId,
                            account_name: account.descriptiveName,
                            account_type: account.isManager ? 'manager' : 'standard',
                            is_active: account.status === 'ENABLED',
                            refresh_token: refreshToken,
                            last_synced_at: new Date().toISOString(),
                        })
                        .select()
                        .single();

                    if (insertError) throw insertError;
                    syncedAccounts.push(inserted);
                }

                // Sync conversion actions for this account
                if (!account.isManager) {
                    try {
                        const conversionActions = await googleAdsClient.getConversionActions(
                            account.customerId,
                            refreshToken
                        );

                        for (const action of conversionActions) {
                            await supabase
                                .from('google_ads_conversion_actions')
                                .upsert({
                                    account_id: syncedAccounts[syncedAccounts.length - 1].id,
                                    conversion_action_id: action.id,
                                    conversion_action_name: action.name,
                                    conversion_type: action.type,
                                    status: action.status,
                                    value_settings: action.valueSettings,
                                    is_enhanced_conversions_enabled: true, // You may want to check this properly
                                    updated_at: new Date().toISOString(),
                                }, {
                                    onConflict: 'account_id,conversion_action_id',
                                });
                        }
                    } catch (convError) {
                        console.error(`Error syncing conversion actions for ${account.customerId}:`, convError);
                    }
                }
            } catch (error) {
                console.error(`Error syncing account ${account.customerId}:`, error);
                errors.push({
                    customerId: account.customerId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        // Log sync operation
        await supabase
            .from('google_ads_sync_log')
            .insert({
                account_id: syncedAccounts[0]?.id, // Use first account for logging
                batch_id: `SYNC-${Date.now()}`,
                sync_type: 'account_sync',
                status: errors.length === 0 ? 'success' : 'partial',
                conversions_sent: accounts.length,
                conversions_accepted: syncedAccounts.length,
                error_message: errors.length > 0 ? JSON.stringify(errors) : null,
                completed_at: new Date().toISOString(),
            });

        return NextResponse.json({
            success: true,
            synced: syncedAccounts.length,
            total: accounts.length,
            accounts: syncedAccounts,
            errors: errors.length > 0 ? errors : undefined,
        });

    } catch (error) {
        console.error('Account sync error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to sync accounts',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

// GET endpoint to list synced accounts
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const businessId = searchParams.get('businessId');

        let query = supabase
            .from('google_ads_accounts')
            .select(`
        *,
        business:businesses(name),
        conversion_actions:google_ads_conversion_actions(*)
      `)
            .eq('is_active', true)
            .order('account_name');

        if (businessId) {
            query = query.eq('business_id', businessId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({
            accounts: data,
            total: data?.length || 0,
        });

    } catch (error) {
        console.error('Fetch accounts error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch accounts' },
            { status: 500 }
        );
    }
}