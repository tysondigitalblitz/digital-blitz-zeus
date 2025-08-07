// app/api/google/accounts/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';
import { googleAdsClient } from '@/lib/google-ads/config';

export async function POST(req: NextRequest) {
    try {
        let { refreshToken } = await req.json();

        if (!refreshToken) {
            // If no refresh token provided, check if we have a connected business
            const { data: connectedBusiness } = await supabase
                .from('businesses')
                .select('google_ads_refresh_token')
                .not('google_ads_refresh_token', 'is', null)
                .limit(1)
                .single();

            if (!connectedBusiness?.google_ads_refresh_token) {
                return NextResponse.json(
                    { error: 'No refresh token provided and no connected businesses found' },
                    { status: 400 }
                );
            }

            refreshToken = connectedBusiness.google_ads_refresh_token;
        }

        // Get all accessible accounts from Google Ads
        const accounts = await googleAdsClient.getAccessibleAccounts(refreshToken);

        // Create businesses for each account
        const createdBusinesses = [];
        const errors = [];

        for (const account of accounts) {
            try {
                // Check if business already exists for this customer ID
                const { data: existingBusiness } = await supabase
                    .from('businesses')
                    .select('id')
                    .eq('name', account.descriptiveName)
                    .single();

                if (!existingBusiness) {
                    // Create new business
                    const { data: newBusiness, error: createError } = await supabase
                        .from('businesses')
                        .insert({
                            name: account.descriptiveName || `Google Ads ${account.customerId}`,
                            description: `Imported from Google Ads Manager - Customer ID: ${account.customerId}`,
                            pixel_id: `gads_${account.customerId.replace(/-/g, '')}`,
                            is_active: account.status === 'ENABLED',
                        })
                        .select()
                        .single();

                    if (createError) throw createError;

                    // Create Google Ads account record
                    const { error: accountError } = await supabase
                        .from('google_ads_accounts')
                        .insert({
                            business_id: newBusiness.id,
                            customer_id: account.customerId,
                            account_name: account.descriptiveName,
                            account_type: account.isManager ? 'manager' : 'standard',
                            is_active: account.status === 'ENABLED',
                            refresh_token: refreshToken,
                            last_synced_at: new Date().toISOString(),
                        });

                    if (accountError) throw accountError;

                    createdBusinesses.push({
                        businessId: newBusiness.id,
                        accountName: account.descriptiveName,
                        customerId: account.customerId,
                    });
                } else {
                    // Update existing business with Google Ads connection
                    const { error: updateError } = await supabase
                        .from('businesses')
                        .update({
                            google_ads_refresh_token: refreshToken,
                            google_ads_connected_at: new Date().toISOString(),
                        })
                        .eq('id', existingBusiness.id);

                    if (updateError) throw updateError;

                    // Create or update Google Ads account record
                    await supabase
                        .from('google_ads_accounts')
                        .upsert({
                            business_id: existingBusiness.id,
                            customer_id: account.customerId,
                            account_name: account.descriptiveName,
                            account_type: account.isManager ? 'manager' : 'standard',
                            is_active: account.status === 'ENABLED',
                            refresh_token: refreshToken,
                            last_synced_at: new Date().toISOString(),
                        }, {
                            onConflict: 'customer_id',
                        });

                    createdBusinesses.push({
                        businessId: existingBusiness.id,
                        accountName: account.descriptiveName,
                        customerId: account.customerId,
                        status: 'updated',
                    });
                }
            } catch (error) {
                console.error(`Error importing account ${account.customerId}:`, error);
                errors.push({
                    customerId: account.customerId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        return NextResponse.json({
            success: true,
            imported: createdBusinesses.length,
            total: accounts.length,
            businesses: createdBusinesses,
            errors: errors.length > 0 ? errors : undefined,
        });

    } catch (error) {
        console.error('Import accounts error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to import accounts',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}