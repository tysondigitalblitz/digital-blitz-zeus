import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';
import { GeolocationService } from '@/lib/geolocation/service';

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const ip =
            req.headers.get("x-forwarded-for")?.split(',')[0].trim() ||
            req.headers.get("x-real-ip") ||
            "unknown";

        const userAgent = req.headers.get("user-agent") || "unknown";

        const {
            client_id,
            gclid,
            wbraid,
            gbraid,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_term,
            utm_content,
            page_url,
            page_title,
            referrer,
            platform,
            email,
            phone,
            timestamp,
            test,
            // New fields from enhanced pixel
            session_id,
            landing_page,
            pages_viewed,
            time_on_site
        } = body;

        // Handle test requests
        if (test) {
            return new NextResponse(
                JSON.stringify({
                    success: true,
                    message: "Test successful",
                    received: body
                }),
                {
                    status: 200,
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }

        const isGoogleTraffic =
            Boolean(client_id) && Boolean(gclid || wbraid || gbraid);

        if (!isGoogleTraffic) {
            return new NextResponse(
                JSON.stringify({
                    skipped: true,
                    reason: "Not Google traffic",
                    hasClientId: Boolean(client_id),
                    hasGoogleParams: Boolean(gclid || wbraid || gbraid)
                }),
                {
                    status: 200,
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }

        // Get geolocation data
        let geoData = null;
        if (ip && ip !== "unknown") {
            try {
                const geoService = new GeolocationService();
                geoData = await geoService.getLocation(ip);
            } catch (geoError) {
                // Log but don't fail the request
                console.error("Geolocation error:", geoError);
            }
        }

        // Build the insert object dynamically to handle optional fields
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const insertData: any = {
            client_id,
            gclid,
            wbraid,
            gbraid,
            utm_source,
            utm_medium,
            utm_campaign,
            page_url,
            ip_address: ip,
            user_agent: userAgent,
            email,
            phone,
        };

        // Add optional fields if they exist
        if (utm_term) insertData.utm_term = utm_term;
        if (utm_content) insertData.utm_content = utm_content;
        if (page_title) insertData.page_title = page_title;
        if (referrer) insertData.referrer = referrer;
        if (platform) insertData.platform = platform;
        if (timestamp) insertData.tracked_at = timestamp;

        // Add session tracking fields
        if (session_id) insertData.session_id = session_id;
        if (landing_page) insertData.landing_page = landing_page;
        if (pages_viewed) insertData.pages_viewed = pages_viewed;
        if (time_on_site) insertData.time_on_site = time_on_site;

        // Add geolocation data if available
        if (geoData) {
            insertData.geo_city = geoData.city;
            insertData.geo_region = geoData.region;
            insertData.geo_country = geoData.country_code;
            insertData.geo_postal_code = geoData.postal_code;
            insertData.geo_latitude = geoData.latitude;
            insertData.geo_longitude = geoData.longitude;
            insertData.geo_metro_code = geoData.metro_code;
            insertData.geo_timezone = geoData.timezone;
            insertData.geo_org = geoData.org;
            insertData.geo_processed = true;
            insertData.geo_processed_at = new Date().toISOString();
        }

        const { error } = await supabase.from("click_events").insert([insertData]);

        if (error) {
            console.error("Supabase error:", error);
            return new NextResponse(
                JSON.stringify({
                    error: error.message,
                    code: error.code
                }),
                {
                    status: 500,
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }

        return new NextResponse(
            JSON.stringify({
                success: true,
                platform: platform || 'unknown',
                tracked: true,
                hasGeoData: !!geoData,
                geoCountry: geoData?.country_code
            }),
            {
                status: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    } catch (error) {
        console.error("Route error:", error);
        return new NextResponse(
            JSON.stringify({
                error: "Internal server error",
                message: error instanceof Error ? error.message : "Unknown error"
            }),
            {
                status: 500,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    }
}

export const dynamic = 'force-dynamic';