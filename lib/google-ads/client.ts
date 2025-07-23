// lib/google-ads/client.ts
import { GoogleAdsApi } from 'google-ads-api';

class GoogleAdsConversionUploader {
    private client: GoogleAdsApi;

    constructor() {
        this.client = new GoogleAdsApi({
            client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
            client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
            developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
        });
    }

    async uploadOfflineConversions(
        customerId: string,
        conversions: OfflineConversion[]
    ) {
        const customer = this.client.Customer({
            customer_id: customerId,
            refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!
        });

        try {
            // Upload in batches of 2000 (Google's limit)
            const batchSize = 2000;
            const results = [];

            for (let i = 0; i < conversions.length; i += batchSize) {
                const batch = conversions.slice(i, i + batchSize);

                const clickConversions = batch.map(conv => ({
                    gclid: conv.gclid,
                    conversion_action: `customers/${customerId}/conversionActions/${conv.conversionActionId}`,
                    conversion_date_time: conv.conversionDateTime,
                    conversion_value: conv.conversionValue,
                    currency_code: conv.conversionCurrency,
                    order_id: conv.orderId,
                    // Enhanced conversions data
                    user_identifiers: [
                        ...(conv.hashedEmail ? [{
                            hashed_email: conv.hashedEmail,
                            user_identifier_source: 'FIRST_PARTY'
                        }] : []),
                        ...(conv.hashedPhoneNumber ? [{
                            hashed_phone_number: conv.hashedPhoneNumber,
                            user_identifier_source: 'FIRST_PARTY'
                        }] : [])
                    ]
                }));

                const response = await customer.conversionUploads.uploadClickConversions({
                    conversions: clickConversions,
                    partial_failure: true
                });

                results.push(response);
            }

            return {
                success: true,
                results,
                totalUploaded: conversions.length
            };

        } catch (error) {
            console.error('Google Ads API error:', error);
            throw error;
        }
    }
}

export { GoogleAdsConversionUploader };

// app/api/google-ads/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';
import { GoogleAdsConversionUploader } from '@/lib/google-ads/client';

export async function POST(req: NextRequest) {
    try {
        const { conversions, customerId, conversionActionId } = await req.json();

        if (!conversions || !customerId || !conversionActionId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Add conversion action ID to each conversion
        const conversionsWithActionId = conversions.map(conv => ({
            ...conv,
            conversionActionId
        }));

        // Upload to Google Ads
        const uploader = new GoogleAdsConversionUploader();
        const result = await uploader.uploadOfflineConversions(
            customerId,
            conversionsWithActionId
        );

        // Store upload record
        await supabase
            .from('google_ads_uploads')
            .insert({
                customer_id: customerId,
                conversion_action_id: conversionActionId,
                total_conversions: conversions.length,
                upload_status: 'completed',
                response_data: result,
                uploaded_at: new Date().toISOString()
            });

        // Mark click_events as synced
        const eventIds = conversions.map(c => c.orderId);
        await supabase
            .from('click_events')
            .update({ synced_to_google: true })
            .in('id', eventIds);

        return NextResponse.json({
            success: true,
            totalUploaded: result.totalUploaded,
            results: result.results
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload conversions' },
            { status: 500 }
        );
    }
}