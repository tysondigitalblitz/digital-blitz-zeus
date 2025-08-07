import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';

export async function GET() {
    try {
        // Get recent conversions grouped by batch
        const { data, error } = await supabase
            .from('google_conversions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200); // Get more records to group properly

        if (error) throw error;

        // Group by upload batch
        const batchMap = new Map();

        data?.forEach(conv => {
            const batchId = conv.upload_batch_id || 'manual';

            if (!batchMap.has(batchId)) {
                batchMap.set(batchId, {
                    id: batchId,
                    created_at: conv.created_at,
                    file_name: conv.file_name,
                    total_records: 0,
                    matched_records: 0,
                    platform: 'google'
                });
            }

            const batch = batchMap.get(batchId);
            batch.total_records++;
            if (conv.matched_gclid) {
                batch.matched_records++;
            }
        });

        // Convert to array and sort by date
        const uploads = Array.from(batchMap.values())
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 10); // Return only 10 most recent

        return NextResponse.json({ uploads });
    } catch (error) {
        console.error('Error fetching recent uploads:', error);
        return NextResponse.json(
            { error: 'Failed to fetch recent uploads' },
            { status: 500 }
        );
    }
}