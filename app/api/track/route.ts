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
        page_url,
        email,
        phone,
    } = body;

    const isGoogleTraffic =
        Boolean(client_id) && Boolean(gclid || wbraid || gbraid);

    if (!isGoogleTraffic) {
        return new NextResponse(
            JSON.stringify({ skipped: true }),
            {
                status: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    }

    const { error } = await supabase.from("click_events").insert([
        {
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
        },
    ]);

    if (error) {
        return new NextResponse(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    }

    return new NextResponse(
        JSON.stringify({ success: true }),
        {
            status: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
        }
    );
}
export const dynamic = 'force-dynamic';