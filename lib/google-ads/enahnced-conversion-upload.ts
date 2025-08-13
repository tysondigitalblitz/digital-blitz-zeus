// lib/google-ads/enhanced-conversion-upload.ts
import crypto from 'crypto';
import supabase from '@/lib/supabase/server';
import { googleAdsClient, EnhancedConversionData } from './config';

export class EnhancedConversionUploadService {
    // Hash functions for PII
    private static hash(value: string): string {
        if (!value) return '';
        return crypto
            .createHash('sha256')
            .update(value.toLowerCase().trim())
            .digest('hex');
    }

    private static formatPhone(phone: string): string {
        if (!phone) return '';
        // Remove all non-digits
        let cleaned = phone.replace(/\D/g, '');

        // Add country code if not present (assuming US)
        if (cleaned.length === 10) {
            cleaned = '1' + cleaned;
        }

        // Format as E.164
        return '+' + cleaned;
    }

    // Prepare conversion data for Google Ads API
    static prepareConversionData(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conversion: any,
        conversionActionId: string,
        customerId: string
    ): EnhancedConversionData {
        // Format phone for hashing
        const formatPhone = (phone: string): string => {
            if (!phone) return '';
            // Remove all non-digits
            let cleaned = phone.replace(/\D/g, '');
            // Add country code if not present (assuming US)
            if (cleaned.length === 10) {
                cleaned = '1' + cleaned;
            }
            // Format as E.164
            return '+' + cleaned;
        };

        const conversionData = {
            gclid: conversion.matched_gclid || undefined,
            conversionAction: `customers/${customerId}/conversionActions/${conversionActionId}`,
            conversion_date_time: new Date(conversion.purchase_date).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '+00:00'),
            conversionValue: parseFloat(conversion.purchase_amount),
            currencyCode: 'USD',
            orderId: conversion.order_id,

            // User identifiers
            hashedEmail: conversion.email ? this.hash(conversion.email) : undefined,
            hashedPhoneNumber: conversion.phone ? this.hash(formatPhone(conversion.phone)) : undefined,
            addressInfo: (conversion.city || conversion.zip_code) ? {
                hashedFirstName: conversion.first_name ? this.hash(conversion.first_name) : undefined,
                hashedLastName: conversion.last_name ? this.hash(conversion.last_name) : undefined,
                city: conversion.city,
                state: conversion.state,
                countryCode: 'US',
                postalCode: conversion.zip_code,
            } : undefined,
        };

        // Add this debug log:
        console.log('Prepared conversion data:', JSON.stringify(conversionData, null, 2));

        return conversionData;
    }


    // Upload conversions to Google Ads
    static async uploadBatch(
        batchId: string,
        accountId: string,
        conversionActionId: string
    ) {
        try {
            // Get account details
            const { data: account, error: accountError } = await supabase
                .from('google_ads_accounts')
                .select('*')
                .eq('id', accountId)
                .single();

            if (accountError || !account) {
                throw new Error('Google Ads account not found');
            }

            // Get conversions to upload
            const { data: conversions, error: convError } = await supabase
                .from('google_conversions')
                .select('*')
                .eq('upload_batch_id', batchId)
                .eq('processed', true)
                .eq('synced_to_google', false)
                .limit(1000); // Google Ads API limit

            if (convError || !conversions || conversions.length === 0) {
                return {
                    success: false,
                    error: 'No conversions to upload',
                };
            }

            // Prepare conversions for upload
            const enhancedConversions = conversions.map(conv =>
                this.prepareConversionData(conv, conversionActionId, account.customer_id)
            );

            // Create sync log entry
            const { data: syncLog } = await supabase
                .from('google_ads_sync_log')
                .insert({
                    account_id: accountId,
                    batch_id: batchId,
                    sync_type: 'conversion_upload',
                    status: 'pending',
                    conversions_sent: enhancedConversions.length,
                    request_data: { conversionActionId, conversionCount: enhancedConversions.length },
                })
                .select()
                .single();

            // Upload to Google Ads
            const uploadResult = await googleAdsClient.uploadEnhancedConversions(
                account.customer_id,
                account.refresh_token,
                enhancedConversions
            );

            // Update sync log with results
            await supabase
                .from('google_ads_sync_log')
                .update({
                    status: uploadResult.success ? 'success' : 'failed',
                    response_data: uploadResult,
                    error_message: uploadResult.error,
                    conversions_accepted: uploadResult.success ? enhancedConversions.length : 0,
                    completed_at: new Date().toISOString(),
                })
                .eq('id', syncLog.id);

            // If successful, mark conversions as synced
            if (uploadResult.success) {
                const conversionIds = conversions.map(c => c.id);
                await supabase
                    .from('google_conversions')
                    .update({
                        synced_to_google: true,
                        google_sync_at: new Date().toISOString(),
                        google_sync_response: uploadResult.results,
                    })
                    .in('id', conversionIds);
            }

            return {
                success: uploadResult.success,
                uploaded: enhancedConversions.length,
                results: uploadResult,
                syncLogId: syncLog.id,
            };

        } catch (error) {
            console.error('Enhanced conversion upload error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    // Upload all pending conversions for a business
    static async uploadPendingConversions(businessId: string) {
        try {
            // Get all active Google Ads accounts for the business
            const { data: accounts, error: accountError } = await supabase
                .from('google_ads_accounts')
                .select(`
          *,
          conversion_actions:google_ads_conversion_actions(*)
        `)
                .eq('business_id', businessId)
                .eq('is_active', true);

            if (accountError || !accounts) {
                throw new Error('No active Google Ads accounts found');
            }

            const results = [];

            for (const account of accounts) {
                // Get pending conversions for this account
                const { data: pendingBatches } = await supabase
                    .from('google_conversions')
                    .select('upload_batch_id')
                    .eq('google_ads_account_id', account.id)
                    .eq('processed', true)
                    .eq('synced_to_google', false)
                    .not('matched_gclid', 'is', null)

                if (!pendingBatches || pendingBatches.length === 0) continue;

                console.log('Checking Enhanced Conversions for Leads setting...');
                const enhancedConversionsSettings = await googleAdsClient.checkEnhancedConversionsForLeads(account.customer_id, account.refresh_token);
                console.log('Enhanced Conversions for Leads settings:', enhancedConversionsSettings);

                // Find the default conversion action (or you can make this configurable)
                const conversionAction = account.conversion_actions?.find(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (action: any) => action.status === 'ENABLED'
                );

                if (!conversionAction) {
                    console.error(`No active conversion action for account ${account.customer_id}`);
                    continue;
                }

                // Upload each batch
                for (const batch of pendingBatches) {
                    const result = await this.uploadBatch(
                        batch.upload_batch_id,
                        account.id,
                        conversionAction.conversion_action_id
                    );
                    results.push({
                        accountId: account.customer_id,
                        batchId: batch.upload_batch_id,
                        ...result,
                    });
                }
            }

            return {
                success: true,
                results,
            };

        } catch (error) {
            console.error('Upload pending conversions error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}