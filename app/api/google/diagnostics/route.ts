// app/api/google/diagnostics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';
import { GoogleAdsApi } from 'google-ads-api';

export async function POST(req: NextRequest) {
    try {
        const { accountId, conversionActionId } = await req.json();

        // Get account details with refresh token
        const { data: account, error: accountError } = await supabase
            .from('google_ads_accounts')
            .select('*')
            .eq('id', accountId)
            .single();

        if (accountError || !account) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        // Initialize Google Ads client
        const client = new GoogleAdsApi({
            client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
            client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
            developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
        });

        const customer = client.Customer({
            customer_id: account.customer_id.replace(/-/g, ''),
            refresh_token: account.refresh_token,
        });

        // Query 1: Check conversion action details
        const conversionActionQuery = `
            SELECT 
                conversion_action.id,
                conversion_action.name,
                conversion_action.type,
                conversion_action.status,
                conversion_action.category,
                conversion_action.counting_type,
                conversion_action.attribution_model_settings.attribution_model,
                conversion_action.resource_name
            FROM conversion_action 
            WHERE conversion_action.id = ${conversionActionId}
        `;

        const conversionResult = await customer.query(conversionActionQuery);

        // Query 2: Check recent upload status
        const uploadStatusQuery = `
            SELECT 
                offline_conversion_upload_client_summary.client,
                offline_conversion_upload_client_summary.status,
                offline_conversion_upload_client_summary.total_event_count,
                offline_conversion_upload_client_summary.successful_event_count,
                offline_conversion_upload_client_summary.failed_event_count,
                segments.date
            FROM offline_conversion_upload_client_summary
            WHERE segments.date DURING LAST_7_DAYS
        `;

        const uploadResult = await customer.query(uploadStatusQuery);

        // Query 3: Check if Enhanced Conversions is properly enabled
        const customerSettingsQuery = `
            SELECT 
                customer.conversion_tracking_setting.accepted_customer_data_terms,
                customer.conversion_tracking_setting.enhanced_conversions_for_leads_enabled,
                customer.conversion_tracking_setting.conversion_tracking_id,
                customer.conversion_tracking_setting.conversion_tracking_status
            FROM customer
        `;

        const settingsResult = await customer.query(customerSettingsQuery);

        // Query 4: Check for any conversion uploads in the last 7 days
        const conversionUploadQuery = `
            SELECT 
                conversion_upload_metrics.all_conversions,
                conversion_upload_metrics.all_conversions_value,
                segments.date
            FROM conversion_upload_metrics
            WHERE segments.date DURING LAST_7_DAYS
        `;

        const metricsResult = await customer.query(conversionUploadQuery);

        return NextResponse.json({
            diagnostics: {
                conversionAction: conversionResult,
                uploadStatus: uploadResult,
                customerSettings: settingsResult,
                uploadMetrics: metricsResult,
                analysis: {
                    hasCorrectType: conversionResult[0]?.conversion_action?.type === 'UPLOAD_CLICKS',
                    isEnabled: conversionResult[0]?.conversion_action?.status === 'ENABLED',
                    enhancedConversionsEnabled: settingsResult[0]?.customer?.conversion_tracking_setting?.enhanced_conversions_for_leads_enabled,
                    customerDataTermsAccepted: settingsResult[0]?.customer?.conversion_tracking_setting?.accepted_customer_data_terms,
                }
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Diagnostic error:', error);
        return NextResponse.json({
            error: 'Diagnostic failed',
            details: error.message,
            errorCode: error.code,
            requestId: error.request_id
        }, { status: 500 });
    }
}