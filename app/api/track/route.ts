import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';

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
            req.headers.get("x-forwarded-for") ||
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
            utm_term,        // New field
            utm_content,     // New field
            page_url,
            page_title,      // New field
            referrer,        // New field
            platform,        // New field
            email,
            phone,
            timestamp,       // New field
            test            // New field for testing
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

        // Build the insert object dynamically to handle optional fields
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
                tracked: true
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