// app/api/process-geo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';
import { GeolocationService } from '@/lib/geolocation/service';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(req: NextRequest) {
    try {
        // Get unprocessed click events
        const { data: events, error } = await supabase
            .from('click_events')
            .select('id, ip_address')
            .is('geo_processed', false)
            .not('ip_address', 'eq', 'unknown')
            .limit(100); // Process in batches

        if (error) throw error;
        if (!events || events.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No events to process'
            });
        }

        const geoService = new GeolocationService();

        // Get unique IPs
        const uniqueIPs = [...new Set(events.map(e => e.ip_address))];

        // Batch get locations
        const locations = await geoService.batchGetLocations(uniqueIPs);

        // Update events with geo data
        const updates = [];
        for (const event of events) {
            const location = locations.get(event.ip_address);
            if (location) {
                updates.push({
                    id: event.id,
                    geo_city: location.city,
                    geo_region: location.region,
                    geo_country: location.country_code,
                    geo_postal_code: location.postal_code,
                    geo_latitude: location.latitude,
                    geo_longitude: location.longitude,
                    geo_metro_code: location.metro_code,
                    geo_timezone: location.timezone,
                    geo_org: location.org,
                    geo_processed: true,
                    geo_processed_at: new Date().toISOString()
                });
            }
        }

        // Batch update
        if (updates.length > 0) {
            for (const update of updates) {
                const { id, ...data } = update;
                await supabase
                    .from('click_events')
                    .update(data)
                    .eq('id', id);
            }
        }

        return NextResponse.json({
            success: true,
            processed: events.length,
            updated: updates.length,
            locations: locations.size
        });

    } catch (error) {
        console.error('Geo processing error:', error);
        return NextResponse.json(
            { error: 'Failed to process geolocation data' },
            { status: 500 }
        );
    }
}

// Cron endpoint to process geo data regularly
export async function GET(req: NextRequest) {
    // Verify cron secret if needed
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // Process batch
    return POST(req);
}