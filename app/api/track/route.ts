import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    const body = await req.json();

    const ip =
        req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        'unknown';

    const userAgent = req.headers.get('user-agent') || 'unknown';

    const {
        client_id,
        gclid,
        wbraid,
        gbraid,
        utm_source,
        utm_medium,
        utm_campaign,
        page_url,
    } = body;

    const { error } = await supabase.from('click_events').insert([
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
        },
    ]);

    if (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
}

export const config = {
    runtime: 'edge',
};