// app/api/backfill-geo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';
import { GeolocationService } from '@/lib/geolocation/service';

export async function POST(req: NextRequest) {
    try {
        // Optional: Add authentication
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get parameters from request
        const body = await req.json();
        const {
            batchSize = 50,      // Process in smaller batches
            startFrom = 0,       // For pagination
            dryRun = false,      // Test without updating
            clientId = null      // Optional: filter by client
        } = body;

        // Count total unprocessed records
        let countQuery = supabase
            .from('click_events')
            .select('id', { count: 'exact', head: true })
            .is('geo_processed', false)
            .not('ip_address', 'eq', 'unknown');

        if (clientId) {
            countQuery = countQuery.eq('client_id', clientId);
        }

        const { count: totalCount } = await countQuery;

        // Get batch of unprocessed events
        let query = supabase
            .from('click_events')
            .select('id, ip_address, client_id, timestamp')
            .is('geo_processed', false)
            .not('ip_address', 'eq', 'unknown')
            .range(startFrom, startFrom + batchSize - 1)
            .order('timestamp', { ascending: false });

        if (clientId) {
            query = query.eq('client_id', clientId);
        }

        const { data: events, error } = await query;

        if (error) throw error;

        if (!events || events.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No unprocessed events found',
                totalUnprocessed: totalCount || 0,
                processed: 0
            });
        }

        // Initialize geolocation service
        const geoService = new GeolocationService();

        // Process results
        const results = {
            processed: 0,
            updated: 0,
            failed: 0,
            errors: [] as unknown[],
            samples: [] as unknown[]
        };

        // Get unique IPs to minimize API calls
        const uniqueIPs = [...new Set(events.map(e => e.ip_address))];
        const ipToLocation = new Map();

        // Batch process unique IPs
        for (let i = 0; i < uniqueIPs.length; i += 10) {
            const batch = uniqueIPs.slice(i, i + 10);

            for (const ip of batch) {
                try {
                    const location = await geoService.getLocation(ip);
                    if (location) {
                        ipToLocation.set(ip, location);
                    }
                } catch (err) {
                    results.errors.push({
                        ip,
                        error: err instanceof Error ? err.message : 'Unknown error'
                    });
                }
            }

            // Small delay between batches to respect rate limits
            if (i + 10 < uniqueIPs.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        // Update events with geo data
        for (const event of events) {
            results.processed++;

            const location = ipToLocation.get(event.ip_address);
            if (location) {
                const updateData = {
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
                };

                // Add to samples for review
                if (results.samples.length < 5) {
                    results.samples.push({
                        id: event.id,
                        ip: event.ip_address,
                        location: location
                    });
                }

                // Update database if not dry run
                if (!dryRun) {
                    const { error: updateError } = await supabase
                        .from('click_events')
                        .update(updateData)
                        .eq('id', event.id);

                    if (updateError) {
                        results.failed++;
                        results.errors.push({
                            id: event.id,
                            error: updateError.message
                        });
                    } else {
                        results.updated++;
                    }
                } else {
                    results.updated++; // Count as would-be updated
                }
            } else {
                results.failed++;
            }
        }

        // Calculate progress
        const progress = {
            currentBatch: `${startFrom + 1}-${startFrom + events.length}`,
            totalUnprocessed: totalCount || 0,
            percentComplete: totalCount ? Math.round(((startFrom + events.length) / totalCount) * 100) : 100,
            hasMore: (startFrom + batchSize) < (totalCount || 0),
            nextStartFrom: startFrom + batchSize
        };

        return NextResponse.json({
            success: true,
            dryRun,
            results,
            progress,
            summary: {
                totalProcessed: results.processed,
                successfullyUpdated: results.updated,
                failed: results.failed,
                uniqueIPsProcessed: uniqueIPs.length,
                locationsFound: ipToLocation.size
            }
        });

    } catch (error) {
        console.error('Backfill error:', error);
        return NextResponse.json(
            {
                error: 'Backfill failed',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// GET endpoint to check status
export async function GET(req: NextRequest) {
    try {
        // Optional: Add authentication
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get statistics
        const { data: stats, error } = await supabase
            .from('click_events')
            .select('geo_processed', { count: 'exact' });

        if (error) throw error;

        const total = stats?.length || 0;
        const processed = stats?.filter(s => s.geo_processed).length || 0;
        const unprocessed = total - processed;

        // Get sample of recent geo data
        const { data: recentGeo } = await supabase
            .from('click_events')
            .select('id, ip_address, geo_city, geo_country, geo_processed_at')
            .eq('geo_processed', true)
            .order('geo_processed_at', { ascending: false })
            .limit(10);

        return NextResponse.json({
            status: {
                totalRecords: total,
                processedRecords: processed,
                unprocessedRecords: unprocessed,
                percentComplete: total > 0 ? Math.round((processed / total) * 100) : 0
            },
            recentlyProcessed: recentGeo || [],
            estimatedTime: {
                remainingRecords: unprocessed,
                estimatedMinutes: Math.ceil(unprocessed / 600), // ~600 per minute with rate limits
                note: 'Estimate based on 10 IPs per second with rate limiting'
            }
        });

    } catch (error) {
        console.error('Status error:', error);
        return NextResponse.json(
            {
                error: 'Failed to get status',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}