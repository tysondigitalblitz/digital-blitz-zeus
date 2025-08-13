// app/api/google/conversions/sync-to-google/route.ts
import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';
import { EnhancedConversionUploadService } from '@/lib/google-ads/enahnced-conversion-upload';

// Define types for Google Ads entities
interface GoogleAdsConversionAction {
    id: string;
    account_id: string;
    conversion_action_id: string;
    conversion_action_name: string;
    conversion_type?: string;
    status: string;
    value_settings?: {
        defaultValue?: number;
        defaultCurrencyCode?: string;
        alwaysUseDefaultValue?: boolean;
    };
    is_enhanced_conversions_enabled?: boolean;
    created_at?: string;
    updated_at?: string;
}

interface GoogleAdsAccount {
    id: string;
    business_id: string;
    customer_id: string;
    account_name: string;
    account_type?: string;
    parent_account_id?: string;
    is_active: boolean;
    refresh_token?: string;
    last_synced_at?: string;
    created_at: string;
    updated_at: string;
    conversion_actions?: GoogleAdsConversionAction[];
}

interface SyncLogEntry {
    id: string;
    account_id: string;
    batch_id: string;
    sync_type: string;
    request_data?: unknown;
    response_data?: unknown;
    status: string;
    error_message?: string;
    conversions_sent?: number;
    conversions_accepted?: number;
    started_at: string;
    completed_at?: string;
    account?: {
        customer_id: string;
        account_name: string;
    };
}

export async function POST(req: NextRequest) {
    try {
        const { batchId, businessId, accountId, conversionActionId } = await req.json();

        // Option 1: Upload specific batch with specific conversion action
        if (batchId && accountId) {
            // Get account and conversion action details
            const { data: account, error: accountError } = await supabase
                .from('google_ads_accounts')
                .select(`
                    *,
                    conversion_actions:google_ads_conversion_actions(*)
                `)
                .eq('id', accountId)
                .single() as { data: GoogleAdsAccount | null; error: unknown };

            if (accountError || !account) {
                return NextResponse.json(
                    { error: 'Google Ads account not found' },
                    { status: 404 }
                );
            }

            let selectedConversionActionId: string;

            // If conversion action ID is provided, use it
            if (conversionActionId) {
                // Verify the conversion action belongs to this account
                const validAction = account.conversion_actions?.find(
                    (action) => action.conversion_action_id === conversionActionId
                );

                if (!validAction) {
                    return NextResponse.json(
                        { error: 'Conversion action not found for this account' },
                        { status: 400 }
                    );
                }

                selectedConversionActionId = conversionActionId;
            } else {
                // Find first active conversion action
                const activeAction = account.conversion_actions?.find(
                    (action) => action.status === 'ENABLED'
                );

                if (!activeAction) {
                    return NextResponse.json(
                        { error: 'No active conversion action found for this account' },
                        { status: 400 }
                    );
                }

                selectedConversionActionId = activeAction.conversion_action_id;
            }

            // Upload the batch
            const result = await EnhancedConversionUploadService.uploadBatch(
                batchId,
                accountId,
                selectedConversionActionId
            );

            return NextResponse.json(result);
        }

        // Option 2: Upload all pending conversions for a business
        if (businessId) {
            const result = await EnhancedConversionUploadService.uploadPendingConversions(businessId);
            return NextResponse.json(result);
        }

        return NextResponse.json(
            { error: 'Either batchId + accountId or businessId must be provided' },
            { status: 400 }
        );

    } catch (error) {
        console.error('Sync to Google error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to sync conversions to Google Ads',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

// GET endpoint to check sync status
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const batchId = searchParams.get('batchId');
        const accountId = searchParams.get('accountId');

        let query = supabase
            .from('google_ads_sync_log')
            .select(`
                *,
                account:google_ads_accounts(customer_id, account_name)
            `)
            .order('started_at', { ascending: false })
            .limit(50);

        if (batchId) {
            query = query.eq('batch_id', batchId);
        }

        if (accountId) {
            query = query.eq('account_id', accountId);
        }

        const { data, error } = await query as { data: SyncLogEntry[] | null; error: unknown };

        if (error) throw error;

        return NextResponse.json({
            syncLogs: data || [],
            total: data?.length || 0,
        });

    } catch (error) {
        console.error('Fetch sync status error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch sync status' },
            { status: 500 }
        );
    }
}