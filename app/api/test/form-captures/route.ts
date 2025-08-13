// app/api/test/form-captures/route.ts
import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';

export async function GET() {
    try {
        // Get recent form captures (where email or phone exists)
        const { data: recentCaptures } = await supabase
            .from('click_events')
            .select('*')
            .or('email.not.is.null,phone.not.is.null')
            .order('timestamp', { ascending: false })
            .limit(10);

        // Get capture statistics
        const { data: allEvents } = await supabase
            .from('click_events')
            .select('email, phone')
            .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        const stats = {
            totalEvents: allEvents?.length || 0,
            withEmail: allEvents?.filter(e => e.email).length || 0,
            withPhone: allEvents?.filter(e => e.phone).length || 0,
            withBoth: allEvents?.filter(e => e.email && e.phone).length || 0,
            emailCaptureRate: 0,
            phoneCaptureRate: 0,
            bothFieldsRate: 0
        };

        stats.emailCaptureRate = stats.totalEvents > 0
            ? Math.round((stats.withEmail / stats.totalEvents) * 100) : 0;
        stats.phoneCaptureRate = stats.totalEvents > 0
            ? Math.round((stats.withPhone / stats.totalEvents) * 100) : 0;
        stats.bothFieldsRate = stats.totalEvents > 0
            ? Math.round((stats.withBoth / stats.totalEvents) * 100) : 0;

        return NextResponse.json({
            recentCaptures,
            stats
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: 'Failed to fetch form captures' },
            { status: 500 }
        );
    }
}

