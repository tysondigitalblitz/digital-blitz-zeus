/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/google-ads/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';
import { GoogleAdsConversionUploader, GoogleAdsOAuth2Client } from '@/lib/google-ads/client';
import type { OfflineConversion } from '../../../../lib/types/google';

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
        const conversionsWithActionId: OfflineConversion[] = conversions.map((conv: any) => ({
            ...conv,
            conversionActionId
        }));

        // Initialize uploader
        let uploader: GoogleAdsConversionUploader;

        // If using OAuth2 refresh token
        if (process.env.GOOGLE_ADS_REFRESH_TOKEN) {
            const oauth2Client = new GoogleAdsOAuth2Client();
            const accessToken = await oauth2Client.getAccessToken();
            process.env.GOOGLE_ADS_ACCESS_TOKEN = accessToken;
        }

        // eslint-disable-next-line prefer-const
        uploader = new GoogleAdsConversionUploader();

        // Upload to Google Ads
        const result = await uploader.uploadClickConversions(
            customerId,
            conversionsWithActionId
        );

        // Store upload record in database
        const { error: dbError } = await supabase
            .from('google_ads_uploads')
            .insert({
                customer_id: customerId,
                conversion_action_id: conversionActionId,
                total_conversions: conversions.length,
                upload_status: 'completed',
                response_data: result,
                uploaded_at: new Date().toISOString()
            });

        if (dbError) {
            console.error('Database error:', dbError);
        }

        // Mark conversions as synced
        if (conversions[0]?.orderId) {
            const eventIds = conversions.map((c: { orderId: any; }) => c.orderId).filter(Boolean);
            await supabase
                .from('conversions')
                .update({ synced_to_google: true })
                .in('order_id', eventIds);
        }

        return NextResponse.json({
            success: true,
            totalUploaded: result.totalUploaded,
            results: result.results,
            partialFailures: result.partialFailures || []
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            {
                error: 'Failed to upload conversions',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}