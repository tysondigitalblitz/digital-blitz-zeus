// app/api/sync-conversions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';
import crypto from 'crypto';

// Hash email/phone for Google's enhanced conversions
function hashForGoogle(value: string): string {
    if (!value) return '';
    return crypto
        .createHash('sha256')
        .update(value.toLowerCase().trim())
        .digest('hex');
}

export async function POST(req: NextRequest) {
    const GOOGLE_ADS_CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID;
    const CONVERSION_ACTION_ID = process.env.CONVERSION_ACTION_ID;
    if (!GOOGLE_ADS_CUSTOMER_ID || !CONVERSION_ACTION_ID) {
        return NextResponse.json(
            { error: 'Missing Google Ads configuration' },
            { status: 500 }
        );
    }

    const body = await req.json();
    if (!body || !Array.isArray(body.conversions)) {
        return NextResponse.json(
            { error: 'Invalid request body' },
            { status: 400 }
        );
    }

    try {
        // Get conversions from your database
        const { data: conversions, error } = await supabase
            .from('click_events')
            .select('*')
            .not('gclid', 'is', null)
            .eq('synced_to_google', false)
            .limit(100);

        if (error) throw error;

        if (!conversions || conversions.length === 0) {
            return NextResponse.json({ success: true, message: 'No conversions to sync' });
        }
        // Format for Google Ads API
        const formattedConversions = conversions.map(conv => ({
            gclid: conv.gclid,
            conversion_action: `customers/${GOOGLE_ADS_CUSTOMER_ID}/conversionActions/${CONVERSION_ACTION_ID}`,
            conversion_date_time: conv.tracked_at || conv.timestamp,
            conversion_value: 0, // Set your conversion value
            currency_code: 'USD',
            user_identifiers: [
                ...(conv.email ? [{
                    hashed_email: hashForGoogle(conv.email),
                    user_identifier_source: 'FIRST_PARTY'
                }] : []),
                ...(conv.phone ? [{
                    hashed_phone_number: hashForGoogle(conv.phone),
                    user_identifier_source: 'FIRST_PARTY'
                }] : [])
            ]
        }));

        // TODO: Send to Google Ads API
        // const googleAdsClient = new GoogleAdsApi({...});
        // await googleAdsClient.uploadConversions(formattedConversions);

        // Mark as synced
        const syncedIds = conversions.map(c => c.id);
        await supabase
            .from('click_events')
            .update({ synced_to_google: true })
            .in('id', syncedIds);

        return NextResponse.json({
            success: true,
            synced: formattedConversions.length
        });

    } catch (error) {
        console.error('Sync error:', error);
        return NextResponse.json(
            { error: 'Sync failed' },
            { status: 500 }
        );
    }
}