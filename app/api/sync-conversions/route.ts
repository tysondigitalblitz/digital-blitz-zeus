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

    try {
        const body = await req.json();

        // Option 1: Sync existing matched conversions from conversions table
        if (body.source === 'matched_conversions') {
            const { data: conversions, error } = await supabase
                .from('conversions')
                .select('*')
                .not('matched_gclid', 'is', null)
                .eq('synced_to_google', false)
                .limit(100);

            if (error) throw error;

            if (!conversions || conversions.length === 0) {
                return NextResponse.json({
                    success: true,
                    message: 'No conversions to sync'
                });
            }

            // Format matched conversions for Google Ads
            const formattedConversions = conversions.map(conv => ({
                gclid: conv.matched_gclid,
                conversion_action: `customers/${GOOGLE_ADS_CUSTOMER_ID}/conversionActions/${CONVERSION_ACTION_ID}`,
                conversion_date_time: conv.conversion_time,
                conversion_value: conv.conversion_value || 0,
                currency_code: 'USD',
                order_id: conv.order_id,
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
            console.log('Ready to send to Google:', formattedConversions);

            // Mark as synced
            const syncedIds = conversions.map(c => c.id);
            await supabase
                .from('conversions')
                .update({ synced_to_google: true })
                .in('id', syncedIds);

            return NextResponse.json({
                success: true,
                synced: formattedConversions.length,
                totalValue: conversions.reduce((sum, c) => sum + (c.conversion_value || 0), 0)
            });
        }

        // Option 2: Process new conversion data and match to GCLIDs
        else if (body.conversions && Array.isArray(body.conversions)) {
            // First, match conversions to click events
            const matchedConversions = [];

            for (const conversion of body.conversions) {
                // Find matching click event with GCLID
                const { data: clickEvent } = await supabase
                    .from('click_events')
                    .select('*')
                    .or(`email.eq.${conversion.email},phone.eq.${conversion.phone}`)
                    .not('gclid', 'is', null)
                    .order('timestamp', { ascending: false })
                    .limit(1)
                    .single();

                if (clickEvent) {
                    matchedConversions.push({
                        ...conversion,
                        matched_gclid: clickEvent.gclid,
                        matched_click_event_id: clickEvent.id
                    });
                }
            }

            // Store matched conversions
            if (matchedConversions.length > 0) {
                const { error: insertError } = await supabase
                    .from('conversions')
                    .insert(matchedConversions);

                if (insertError) throw insertError;
            }

            return NextResponse.json({
                success: true,
                totalProcessed: body.conversions.length,
                totalMatched: matchedConversions.length,
                matchRate: ((matchedConversions.length / body.conversions.length) * 100).toFixed(1)
            });
        }

        // Option 3: Direct GCLID conversions (when you already know the GCLID)
        else if (body.directConversions) {
            const formattedConversions = body.directConversions.map(conv => ({
                gclid: conv.gclid,
                conversion_action: `customers/${GOOGLE_ADS_CUSTOMER_ID}/conversionActions/${CONVERSION_ACTION_ID}`,
                conversion_date_time: conv.conversionDateTime,
                conversion_value: conv.conversionValue || 0,
                currency_code: conv.conversionCurrency || 'USD',
                order_id: conv.orderId
            }));

            // TODO: Send to Google Ads API
            console.log('Ready to send to Google:', formattedConversions);

            return NextResponse.json({
                success: true,
                synced: formattedConversions.length
            });
        }

        else {
            return NextResponse.json(
                { error: 'Invalid request format' },
                { status: 400 }
            );
        }

    } catch (error) {
        console.error('Sync error:', error);
        return NextResponse.json(
            { error: 'Sync failed', details: error.message },
            { status: 500 }
        );
    }
}

// GET endpoint to check sync status
export async function GET() {
    try {
        // Get sync statistics
        const { data: stats } = await supabase
            .from('conversions')
            .select('synced_to_google, conversion_value')
            .not('matched_gclid', 'is', null);

        const totalConversions = stats?.length || 0;
        const syncedCount = stats?.filter(s => s.synced_to_google).length || 0;
        const pendingCount = totalConversions - syncedCount;
        const totalValue = stats?.reduce((sum, s) => sum + (s.conversion_value || 0), 0) || 0;

        return NextResponse.json({
            totalConversions,
            syncedCount,
            pendingCount,
            totalValue,
            syncRate: totalConversions > 0 ? ((syncedCount / totalConversions) * 100).toFixed(1) : 0
        });

    } catch (error) {
        console.error('Stats error:', error);
        return NextResponse.json(
            { error: 'Failed to get sync stats' },
            { status: 500 }
        );
    }
}