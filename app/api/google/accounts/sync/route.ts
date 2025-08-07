// app/api/google/accounts/sync/route.ts - Updated to not auto-link accounts
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

        // Verify business exists - try both with and without dashes
        let business;
        let businessError;

        // Try with original businessId first
        const { data: business1, error: error1 } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', businessId)
            .single();

        if (business1) {
            business = business1;
            businessError = null;
        } else {
            // Try with dashes removed
            const cleanBusinessId = businessId.toString().replace(/-/g, '');
            const { data: business2, error: error2 } = await supabase
                .from('businesses')
                .select('*')
                .eq('id', cleanBusinessId)
                .single();

            business = business2;
            businessError = error2;
        }

        if (businessError || !business) {
            return NextResponse.json(
                { error: 'Business not found', attempted: [businessId, businessId.toString().replace(/-/g, '')] },
                { status: 404 }
            );
        }

        // Get accessible accounts from Google Ads
        const accounts = await googleAdsClient.getAccessibleAccounts(refreshToken);

        // Sync accounts to database WITHOUT auto-linking to business
        const syncedAccounts = [];
        const errors = [];

        for (const account of accounts) {
            console.log('Processing account:', {
                customerId: account.customerId,
                descriptiveName: account.descriptiveName,
                isManager: account.isManager,
                status: account.status
            });

            try {
                // Check if account already exists
                const { data: existingAccount } = await supabase
                    .from('google_ads_accounts')
                    .select('id, business_id')
                    .eq('customer_id', account.customerId)
                    .single();

                console.log('Existing account:', existingAccount);

                if (existingAccount) {
                    // Update existing account but PRESERVE existing business_id
                    const { data: updated, error: updateError } = await supabase
                        .from('google_ads_accounts')
                        .update({
                            account_name: account.descriptiveName,
                            account_type: account.isManager ? 'manager' : 'standard',
                            is_active: account.status === 'ENABLED',
                            refresh_token: refreshToken,
                            last_synced_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            // DON'T update business_id - preserve existing links
                        })
                        .eq('id', existingAccount.id)
                        .select()
                        .single();

                    if (updateError) throw updateError;
                    syncedAccounts.push(updated);
                } else {
                    // Insert new account WITHOUT business_id (unlinked)
                    const { data: inserted, error: insertError } = await supabase
                        .from('google_ads_accounts')
                        .insert({
                            // business_id: null, // Explicitly leave unlinked
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

                // Get the current account data for conversion sync
                const currentAccount = syncedAccounts[syncedAccounts.length - 1];

                // Sync conversion actions for this account
                if (!account.isManager && currentAccount) {
                    try {
                        const conversionActions = await googleAdsClient.getConversionActions(
                            account.customerId,
                            refreshToken
                        );

                        for (const action of conversionActions) {
                            const conversionActionData = {
                                account_id: currentAccount.id,
                                conversion_action_id: action.id,
                                conversion_action_name: action.name,
                                conversion_type: action.type,
                                category: action.category,
                                status: action.status,
                                include_in_conversions_metric: action.includeInConversionsMetric,
                                value_settings: action.valueSettings,
                                resource_name: `customers/${account.customerId.replace(/-/g, '')}/conversionActions/${action.id}`,
                                updated_at: new Date().toISOString(),
                            };

                            console.log('Syncing conversion action:', {
                                id: action.id,
                                name: action.name,
                                type: action.type,
                                status: action.status
                            });

                            await supabase
                                .from('google_ads_conversion_actions')
                                .upsert(conversionActionData, {
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
        if (syncedAccounts.length > 0) {
            await supabase
                .from('google_ads_sync_log')
                .insert({
                    account_id: syncedAccounts[0]?.id,
                    batch_id: `SYNC-${Date.now()}`,
                    sync_type: 'account_sync',
                    status: errors.length === 0 ? 'success' : 'partial',
                    conversions_sent: accounts.length,
                    conversions_accepted: syncedAccounts.length,
                    error_message: errors.length > 0 ? JSON.stringify(errors) : null,
                    completed_at: new Date().toISOString(),
                });
        }

        return NextResponse.json({
            success: true,
            synced: syncedAccounts.length,
            total: accounts.length,
            accounts: syncedAccounts,
            errors: errors.length > 0 ? errors : undefined,
            note: "Accounts synced without auto-linking. Use the Link Account feature to connect accounts to businesses."
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

// GET endpoint to list synced accounts - MOVED OUTSIDE THE POST FUNCTION
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